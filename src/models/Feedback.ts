import mongoose, { Document, Model, Schema } from "mongoose";

export type FeedbackStatus = "pending" | "approved" | "rejected";

export interface IFeedback extends Document {
feedbackId: string;
name: string;
email: string;
rating: number;
message: string;
serviceName?: string;
bookingId?: string;
verifiedCustomer: boolean;
publishRequested: boolean;
status: FeedbackStatus;
adminNote?: string;
publishedAt?: Date | null;
createdAt: Date;
updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
{
feedbackId: {
type: String,
required: true,
unique: true,
index: true,
},
name: {
  type: String,
  required: true,
  trim: true,
  maxlength: 120,
},

email: {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  maxlength: 320,
  index: true,
},

rating: {
  type: Number,
  required: true,
  min: 1,
  max: 5,
},

message: {
  type: String,
  required: true,
  trim: true,
  maxlength: 2000,
},

serviceName: {
  type: String,
  trim: true,
  maxlength: 180,
},

bookingId: {
  type: String,
  trim: true,
  maxlength: 80,
  index: true,
},

verifiedCustomer: {
  type: Boolean,
  default: false,
  index: true,
},

publishRequested: {
  type: Boolean,
  default: false,
},

status: {
  type: String,
  enum: ["pending", "approved", "rejected"],
  default: "pending",
  index: true,
},

adminNote: {
  type: String,
  trim: true,
  maxlength: 1000,
},

publishedAt: {
  type: Date,
  default: null,
},

},
{
timestamps: true,
}
);

FeedbackSchema.index({
status: 1,
publishRequested: 1,
createdAt: -1,
});

const Feedback: Model<IFeedback> =
mongoose.models.Feedback ||
mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
