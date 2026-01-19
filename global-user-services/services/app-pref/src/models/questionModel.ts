import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema({
    answerId: { type: String, required: true },
    answerText: { type: String, required: true },
    nextQuestionId: { type: String, required: false }
});

const QuestionSchema = new mongoose.Schema({
    brandId: { type: String, required: true },
    questionId: { type: String, required: true },
    isMultiSelect: { type: Boolean, required: true },
    locale: { type: String, required: true },
    questionText: { type: String, required: true },
    answers: [AnswerSchema]
},{versionKey:false });

export default mongoose.model("PrefQuestion", QuestionSchema);
