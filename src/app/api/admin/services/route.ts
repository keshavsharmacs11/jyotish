import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";

import Service from "@/models/Service";

/*
 * =========================================================
 * GET ALL SERVICES
 * =========================================================
 *
 * Admin can see both active and inactive services.
 */

export async function GET(
  request: NextRequest
) {
  /*
   * =============================================
   * ADMIN AUTHENTICATION
   * =============================================
   */

  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * =============================================
     * CONNECT TO MONGODB
     * =============================================
     */

    await connectMongoose();

    /*
     * =============================================
     * GET ALL SERVICES
     * =============================================
     *
     * Unlike the public /api/services endpoint,
     * this includes inactive services.
     */

    const services =
      await Service.find({})
        .sort({
          category: 1,
          name: 1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    console.error(
      "ADMIN GET SERVICES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch services.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * CREATE SERVICE
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  /*
   * =============================================
   * ADMIN AUTHENTICATION
   * =============================================
   */

  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * =============================================
     * CONNECT TO MONGODB
     * =============================================
     */

    await connectMongoose();

    /*
     * =============================================
     * READ REQUEST BODY
     * =============================================
     */

    const body = await request.json();

    const {
      serviceId,
      name,
      category,
      description,
      duration,
      price,
      currency,
      consultantIds,
      availableModes,
      active,
    } = body;

    /*
     * =============================================
     * BASIC VALIDATION
     * =============================================
     */

    if (
      !serviceId ||
      !name ||
      !category
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service ID, name and category are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE PRICE
     * =============================================
     */

    if (
      price === undefined ||
      price === null ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid service price is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * NORMALIZE SERVICE ID
     * =============================================
     */

    const normalizedServiceId =
      String(serviceId)
        .trim()
        .toLowerCase();

    /*
     * =============================================
     * CHECK DUPLICATE SERVICE ID
     * =============================================
     */

    const existingService =
      await Service.findOne({
        serviceId:
          normalizedServiceId,
      });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A service with this Service ID already exists.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE CONSULTATION MODES
     * =============================================
     */

    const modes =
      Array.isArray(
        availableModes
      )
        ? availableModes
        : ["video", "voice"];

    const validModes =
      modes.every(
        (mode: unknown) =>
          mode === "video" ||
          mode === "voice"
      );

    if (!validModes) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Available modes can only contain video or voice.",
        },
        {
          status: 400,
        }
      );
    }

    if (modes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one consultation mode is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE DURATION
     * =============================================
     */

    let normalizedDuration:
      | number
      | null = null;

    if (
      duration !== undefined &&
      duration !== null &&
      duration !== ""
    ) {
      const parsedDuration =
        Number(duration);

      if (
        Number.isNaN(
          parsedDuration
        ) ||
        parsedDuration < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Duration must be a valid positive number.",
          },
          {
            status: 400,
          }
        );
      }

      normalizedDuration =
        parsedDuration;
    }

    /*
     * =============================================
     * CREATE SERVICE
     * =============================================
     */

    const service =
      await Service.create({
        serviceId:
          normalizedServiceId,

        name:
          String(name).trim(),

        category:
          String(category).trim(),

        description:
          description
            ? String(description).trim()
            : "",

        duration:
          normalizedDuration,

        price:
          Number(price),

        currency:
          currency
            ? String(currency)
                .trim()
                .toUpperCase()
            : "INR",

        consultantIds:
          Array.isArray(
            consultantIds
          )
            ? consultantIds.map(
                (id: unknown) =>
                  String(id)
              )
            : [],

        availableModes:
          modes,

        active:
          active === undefined
            ? true
            : Boolean(active),
      });

    /*
     * =============================================
     * SUCCESS
     * =============================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Service created successfully.",

        service,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN CREATE SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create service.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * UPDATE SERVICE
 * =========================================================
 *
 * Used by the Admin Services "Edit" functionality.
 *
 * IMPORTANT:
 *
 * serviceId is treated as a permanent/stable identifier.
 * It is used to find the service but is never changed.
 *
 * consultantIds are also intentionally preserved.
 */

export async function PATCH(
  request: NextRequest
) {
  /*
   * =============================================
   * ADMIN AUTHENTICATION
   * =============================================
   */

  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * =============================================
     * CONNECT TO MONGODB
     * =============================================
     */

    await connectMongoose();

    /*
     * =============================================
     * READ REQUEST BODY
     * =============================================
     */

    const body = await request.json();

    const {
      serviceId,
      name,
      category,
      description,
      duration,
      price,
      currency,
      availableModes,
      active,
    } = body;

    /*
     * =============================================
     * VALIDATE SERVICE ID
     * =============================================
     */

    if (
      !serviceId ||
      typeof serviceId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedServiceId =
      serviceId
        .trim()
        .toLowerCase();

    /*
     * =============================================
     * VALIDATE NAME
     * =============================================
     */

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service name is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE CATEGORY
     * =============================================
     */

    if (
      !category ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service category is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE PRICE
     * =============================================
     */

    if (
      price === undefined ||
      price === null ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid service price is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE CONSULTATION MODES
     * =============================================
     */

    const modes =
      Array.isArray(
        availableModes
      )
        ? availableModes
        : [];

    const validModes =
      modes.every(
        (mode: unknown) =>
          mode === "video" ||
          mode === "voice"
      );

    if (!validModes) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Available modes can only contain video or voice.",
        },
        {
          status: 400,
        }
      );
    }

    if (modes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one consultation mode is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =============================================
     * VALIDATE DURATION
     * =============================================
     */

    let normalizedDuration:
      | number
      | null = null;

    if (
      duration !== undefined &&
      duration !== null &&
      duration !== ""
    ) {
      const parsedDuration =
        Number(duration);

      if (
        Number.isNaN(
          parsedDuration
        ) ||
        parsedDuration <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Duration must be greater than 0.",
          },
          {
            status: 400,
          }
        );
      }

      normalizedDuration =
        parsedDuration;
    }

    /*
     * =============================================
     * FIND EXISTING SERVICE
     * =============================================
     */

    const service =
      await Service.findOne({
        serviceId:
          normalizedServiceId,
      });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =============================================
     * UPDATE EDITABLE FIELDS
     * =============================================
     *
     * serviceId is intentionally untouched.
     *
     * consultantIds are intentionally untouched.
     *
     * This means existing consultant assignments
     * remain safe when an admin changes pricing,
     * duration, description, etc.
     */

    service.name =
      String(name).trim();

    service.category =
      String(category).trim();

    service.description =
      description
        ? String(description).trim()
        : "";

    service.duration =
      normalizedDuration;

    service.price =
      Number(price);

    service.currency =
      currency
        ? String(currency)
            .trim()
            .toUpperCase()
        : "INR";

    service.availableModes =
      modes;

    if (
      active !== undefined
    ) {
      service.active =
        Boolean(active);
    }

    /*
     * =============================================
     * SAVE UPDATED SERVICE
     * =============================================
     */

    await service.save();

    /*
     * =============================================
     * SUCCESS
     * =============================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Service updated successfully.",

      service,
    });
  } catch (error) {
    console.error(
      "ADMIN UPDATE SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update service.",
      },
      {
        status: 500,
      }
    );
  }
}