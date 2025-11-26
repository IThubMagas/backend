import { Schema, model } from "mongoose";

const WorkExperienceSchema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  period: { type: String, required: true },
  achievements: { type: String }
}, { _id: false });

const ProjectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  codeUrl: { type: String, required: true },
  demoUrl: { type: String }
  // contributors: [{ type: Schema.ObjectId }]
}, { _id: false });

const EducationSchema = new Schema({
  degree: { type: String, required: true },
  field: { type: String, required: true },
  institution: { type: String, required: true },
  year: { type: Number, required: true }
}, { _id: false });

const LanguageSchema = new Schema({
  language: { type: String, required: true },
  level: { type: String, required: true, enum: [ "Beginner", "Intermediate", "Advanced", "Native" ] }
}, { _id: false });

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    patronymic: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, unique: true },
    avatar: { type: String },
    roles: { type: [String], default: ["student"] },
    projects: [ ProjectSchema ],
    contacts: {
      linkedin: { type: String },
      telegram: { type: String },
      github: { type: String },
    },
    workExperience: [ WorkExperienceSchema ],
    education: [ EducationSchema ],
    skills: [{ type: String }],
    industry: {
      type: String,
      enum: [ "Web Development", "Programming", "Digital Design", "Game Development", "Information Security", "Digital Marketing" ]
    },
    workFormat: {
      type: String,
      enum: [ "On-site", "Remote", "Hybrid" ] 
    },
    employmentType: {
      type: String,
      enum: [ "Intern", "Volunteer", "Full-time", "Part-time" ]
    },
    status: {
      type: String,
      enum: [ "Not looking", "Open to offers", "Actively searching" ]
    },
    languages: [ LanguageSchema ],
    isPublic: { type: Boolean, default: true },
    isEmailVerified: { type:Boolean, default: false },
    emailVerificationCode: { type: String, default: null },
    emailVerificationCodeExpires: { type: Date, default: null },
    passwordResetCode: { type: String, default: undefined },
    passwordResetCodeExpires: { type: Date, default: undefined },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ isPublic: 1 });

export default model("User", UserSchema);
