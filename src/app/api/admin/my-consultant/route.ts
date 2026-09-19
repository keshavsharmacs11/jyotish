import { NextRequest, NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";
import User from "@/models/User";
import Consultant from "@/models/Consultant";

const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 40;
const MAX_SPECIALIZATION_LENGTH = 200;
const MAX_PHOTO_LENGTH = 5 * 1024 * 1024;

const VALID_MODES = new Set(["video", "voice"]);

type ConsultantInput = {
  name?: unknown;
  phone?: unknown;
  specialization?: unknown;
  photo?: unknown;
  availableModes?: unknown;
};

type AdminUserAccess = {
  email: string;
  consultantProfileEligible?: boolean;
  isSuperAdmin?: boolean;
};

function normalizeModes(
  value: unknown,
): ("video" | "voice")[] {
  if (!Array.isArray(value)) {
    return ["video", "voice"];
  }

  return [
    ...new Set(
      value
        .filter(
          (mode): mode is string =>
            typeof mode === "string",
        )
        .map((mode) => mode.trim().toLowerCase())
        .filter(
          (mode): mode is "video" | "voice" =>
            VALID_MODES.has(mode),
        ),
    ),
  ];
}

function validateInput(
  body: ConsultantInput,
  fallbackName: string,
) {
  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : fallbackName.trim();

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim()
      : "";

  const specialization =
    typeof body.specialization === "string"
      ? body.specialization.trim()
      : "";

  const photo =
    typeof body.photo === "string"
      ? body.photo
      : "";

  const availableModes =
    normalizeModes(body.availableModes);

  if (!name) {
    throw new Error("Consultant name is required.");
  }

  if (name.length > MAX_NAME_LENGTH) {
    throw new Error("Consultant name is too long.");
  }

  if (!phone) {
    throw new Error("Phone number is required.");
  }

  if (phone.length > MAX_PHONE_LENGTH) {
    throw new Error("Phone number is too long.");
  }

  if (!specialization) {
    throw new Error(
      "Area of specialization is required.",
    );
  }

  if (
    specialization.length >
    MAX_SPECIALIZATION_LENGTH
  ) {
    throw new Error(
      "Area of specialization is too long.",
    );
  }

  if (availableModes.length === 0) {
    throw new Error(
      "Select at least one consultation mode.",
    );
  }

  if (photo.length > MAX_PHOTO_LENGTH) {
    throw new Error(
      "Consultant photo is too large. Please use an image smaller than 5 MB.",
    );
  }

  if (
    photo &&
    !photo.startsWith("data:image/")
  ) {
    throw new Error(
      "Invalid consultant photo.",
    );
  }

  return {
    name,
    phone,
    specialization,
    photo,
    availableModes,
  };
}

/*
 * Super Administrator is intentionally treated as a
 * bootstrap administrator.
 *
 * There are two trusted ways to recognize that account,
 * matching the existing requireSuperAdmin() rules:
 *
 * 1. User.isSuperAdmin === true
 * 2. User.email === SUPER_ADMIN_EMAIL
 *
 * Normal administrators still require
 * consultantProfileEligible === true, which is granted
 * through the administrator invitation/activation flow.
 */
function isSuperAdministrator(
  user: AdminUserAccess,
): boolean {
  if (user.isSuperAdmin === true) {
    return true;
  }

  const configuredEmail =
    process.env.SUPER_ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  if (!configuredEmail) {
    return false;
  }

  return (
    user.email.trim().toLowerCase() ===
    configuredEmail
  );
}

function canManageOwnConsultantProfile(
  user: AdminUserAccess,
): boolean {
  return (
    isSuperAdministrator(user) ||
    user.consultantProfileEligible === true
  );
}

function notEligibleResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Your account is not eligible to create or manage a consultant profile. Only the Super Administrator or administrators activated through an administrator invitation can use this feature.",
    },
    { status: 403 },
  );
}

async function getCurrentAdminUser(
  userId: string,
) {
  return User.findOne({
    _id: userId,
    role: "admin",
  })
    .select(
      "_id name email active consultantProfileEligible isSuperAdmin",
    )
    .lean();
}

export async function GET(
  request: NextRequest,
) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const user =
      await getCurrentAdminUser(
        auth.admin.userId,
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator account could not be found.",
        },
        { status: 404 },
      );
    }

    const eligible =
      canManageOwnConsultantProfile(user);

    if (!eligible) {
      return NextResponse.json({
        success: true,
        eligible: false,
        consultant: null,
      });
    }

    const consultant =
      await Consultant.findOne({
        administratorId: user._id,
      }).lean();

    return NextResponse.json({
      success: true,
      eligible: true,
      consultant,
    });
  } catch (error) {
    console.error(
      "ADMIN SELF CONSULTANT GET ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load your consultant profile.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const user =
      await getCurrentAdminUser(
        auth.admin.userId,
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator account could not be found.",
        },
        { status: 404 },
      );
    }

    if (!canManageOwnConsultantProfile(user)) {
      return notEligibleResponse();
    }

    const existingLinked =
      await Consultant.findOne({
        administratorId: user._id,
      });

    if (existingLinked) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your administrator account is already linked to a consultant profile.",
          consultant:
            existingLinked.toObject(),
        },
        { status: 409 },
      );
    }

    const body =
      (await request.json()) as ConsultantInput;

    const input = validateInput(
      body,
      user.name,
    );

    /*
     * If this administrator previously completed a
     * consultant-only invitation using the same email,
     * adopt that unlinked profile instead of creating
     * a duplicate identity.
     */
    let consultant =
      await Consultant.findOne({
        email: user.email,
        $or: [
          { administratorId: null },
          {
            administratorId: {
              $exists: false,
            },
          },
        ],
      });

    if (consultant) {
      consultant.name = input.name;
      consultant.phone = input.phone;
      consultant.specialization =
        input.specialization;
      consultant.photo = input.photo;
      consultant.availableModes =
        input.availableModes;
      consultant.administratorId = user._id;
      consultant.active = true;

      await consultant.save();
    } else {
      consultant =
        await Consultant.create({
          name: input.name,
          email: user.email,
          phone: input.phone,
          specialization:
            input.specialization,
          photo: input.photo,
          availableModes:
            input.availableModes,
          availability: [],
          active: true,
          administratorId: user._id,
        });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Your consultant profile has been created successfully.",
        consultant:
          consultant.toObject(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "ADMIN SELF CONSULTANT CREATE ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create your consultant profile.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const user =
      await getCurrentAdminUser(
        auth.admin.userId,
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator account could not be found.",
        },
        { status: 404 },
      );
    }

    if (!canManageOwnConsultantProfile(user)) {
      return notEligibleResponse();
    }

    const consultant =
      await Consultant.findOne({
        administratorId: user._id,
      });

    if (!consultant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your consultant profile has not been created yet.",
        },
        { status: 404 },
      );
    }

    const body =
      (await request.json()) as ConsultantInput;

    const input = validateInput(
      body,
      consultant.name,
    );

    consultant.name = input.name;
    consultant.phone = input.phone;
    consultant.specialization =
      input.specialization;
    consultant.photo = input.photo;
    consultant.availableModes =
      input.availableModes;

    await consultant.save();

    return NextResponse.json({
      success: true,
      message:
        "Your consultant profile has been updated successfully.",
      consultant:
        consultant.toObject(),
    });
  } catch (error) {
    console.error(
      "ADMIN SELF CONSULTANT UPDATE ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update your consultant profile.",
      },
      { status: 500 },
    );
  }
}
