import { Schema, model } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const fileSchema = new Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  {
    _id: false
  }
);

const videoSchema = new Schema(
  {
    videoFile: {
      type: fileSchema,
      required: true
    },
    thumbnail: {
      type: fileSchema,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = model("Video", videoSchema)