const mongoose = require("mongoose");
const Note = require("../models/note.model");

const ALLOWED_CATEGORIES = ["work", "personal", "study"];

const sendSuccess = (res, statusCode, message, data, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...extra,
    data,
  });
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};

const handleServerError = (res, error) => {
  console.error(error);
  return sendError(res, 500, "Internal server error");
};

const getSanitizedText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const validateRequiredNoteFields = (title, content, res) => {
  if (!getSanitizedText(title) || !getSanitizedText(content)) {
    sendError(res, 400, "Title and content are required");
    return false;
  }

  return true;
};

const validateOptionalCategory = (category, res) => {
  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    sendError(res, 400, "Invalid category. Allowed: work, personal, study");
    return false;
  }

  return true;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createNote = async (req, res) => {
  try {
    const { title, content, category = "personal", isPinned = false } = req.body;

    if (!validateRequiredNoteFields(title, content, res)) {
      return;
    }

    if (!validateOptionalCategory(category, res)) {
      return;
    }

    const note = await Note.create({
      title: getSanitizedText(title),
      content: getSanitizedText(content),
      category,
      isPinned,
    });

    return sendSuccess(res, 201, "Note created successfully", note);
  } catch (error) {
    return handleServerError(res, error);
  }
};

const createBulkNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (!Array.isArray(notes) || notes.length === 0) {
      return sendError(res, 400, "notes array is required and cannot be empty");
    }

    const preparedNotes = [];

    for (const note of notes) {
      const title = getSanitizedText(note.title);
      const content = getSanitizedText(note.content);
      const category = note.category ?? "personal";
      const isPinned = note.isPinned ?? false;

      if (!title || !content) {
        return sendError(res, 400, "Each note must include title and content");
      }

      if (!validateOptionalCategory(category, res)) {
        return;
      }

      preparedNotes.push({
        title,
        content,
        category,
        isPinned,
      });
    }

    const createdNotes = await Note.insertMany(preparedNotes);

    return sendSuccess(
      res,
      201,
      `${createdNotes.length} notes created successfully`,
      createdNotes
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const getAllNotes = async (_req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Notes fetched successfully", notes, {
      count: notes.length,
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid note ID");
    }

    const note = await Note.findById(id);

    if (!note) {
      return sendError(res, 404, "Note not found");
    }

    return sendSuccess(res, 200, "Note fetched successfully", note);
  } catch (error) {
    return handleServerError(res, error);
  }
};

module.exports = {
  createNote,
  createBulkNotes,
  getAllNotes,
  getNoteById,
};
