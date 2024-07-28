import { Schema, model } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const viewSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video"
    },
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    viewer: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    watchHistory: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

viewSchema.plugin(mongooseAggregatePaginate)

export const View = model("View", viewSchema)