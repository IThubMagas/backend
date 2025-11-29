import { Schema, model } from "mongoose";

const WorkExperienceSchema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  period: { type: String, required: true },
  achievements: { type: String }
}, { _id: false });

const ProjectSchema = new Schema({
  link: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const SocialSchema = new Schema({
  social: { type: String, required: true },
  link: { type: String, required: true },
}, { _id: false });

const AchievementsSchema = new Schema({
  text: { type: String, required: true },
  file: { type: String, required: true }
}, { _id: false })

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
    age: { type: Number, min: 0, max: 100 },
    city: { type: String },
    avatar: { type: String },
    roles: { type: [String], default: ["student"] },
    contacts: {
      linkedin: { type: String },
      telegram: { type: String },
      github: { type: String },
    },
    projects: [ ProjectSchema ],
    socials: [ SocialSchema ],
    about: { type: String, maxlength: 1000 },
    achievements: [ AchievementsSchema ],
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
    passwordResetCode: { type: String, default: null },
    passwordResetCodeExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ isPublic: 1 });

export default model("User", UserSchema);
