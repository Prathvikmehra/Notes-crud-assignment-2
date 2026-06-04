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

const parsePinnedValue = (value) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
};

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

const replaceNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid note ID");
    }

    if (!validateRequiredNoteFields(title, content, res)) {
      return;
    }

    if (!validateOptionalCategory(req.body.category, res)) {
      return;
    }

    const replacement = {
      title: getSanitizedText(title),
      content: getSanitizedText(content),
      category: req.body.category ?? "personal",
      isPinned: req.body.isPinned ?? false,
    };

    const result = await Note.replaceOne({ _id: id }, replacement, {
      runValidators: true,
    });

    if (result.matchedCount === 0) {
      return sendError(res, 404, "Note not found");
    }

    const updatedNote = await Note.findById(id);

    return sendSuccess(res, 200, "Note replaced successfully", updatedNote);
  } catch (error) {
    return handleServerError(res, error);
  }
};

const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedUpdates = ["title", "content", "category", "isPinned"];
    const updateKeys = Object.keys(req.body).filter((key) =>
      allowedUpdates.includes(key)
    );

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid note ID");
    }

    if (updateKeys.length === 0) {
      return sendError(res, 400, "No fields provided to update");
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "title") &&
      !getSanitizedText(req.body.title)
    ) {
      return sendError(res, 400, "Title is required");
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "content") &&
      !getSanitizedText(req.body.content)
    ) {
      return sendError(res, 400, "Content is required");
    }

    if (!validateOptionalCategory(req.body.category, res)) {
      return;
    }

    const updates = {};

    for (const key of updateKeys) {
      if (key === "title" || key === "content") {
        updates[key] = getSanitizedText(req.body[key]);
      } else {
        updates[key] = req.body[key];
      }
    }

    const updatedNote = await Note.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedNote) {
      return sendError(res, 404, "Note not found");
    }

    return sendSuccess(res, 200, "Note updated successfully", updatedNote);
  } catch (error) {
    return handleServerError(res, error);
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid note ID");
    }

    const deletedNote = await Note.findByIdAndDelete(id);

    if (!deletedNote) {
      return sendError(res, 404, "Note not found");
    }

    return sendSuccess(res, 200, "Note deleted successfully", null);
  } catch (error) {
    return handleServerError(res, error);
  }
};

const deleteBulkNotes = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 400, "ids array is required and cannot be empty");
    }

    const hasInvalidId = ids.some((id) => !isValidObjectId(id));

    if (hasInvalidId) {
      return sendError(res, 400, "All ids must be valid note IDs");
    }

    const result = await Note.deleteMany({ _id: { $in: ids } });

    return sendSuccess(
      res,
      200,
      `${result.deletedCount} notes deleted successfully`,
      null
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const getNotesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!validateOptionalCategory(category, res)) {
      return;
    }

    const notes = await Note.find({ category }).sort({ createdAt: -1 });

    if (notes.length === 0) {
      return sendError(res, 404, `No notes found for category: ${category}`);
    }

    return sendSuccess(
      res,
      200,
      `Notes fetched for category: ${category}`,
      notes,
      { count: notes.length }
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const getNotesByStatus = async (req, res) => {
  try {
    const pinned = parsePinnedValue(req.params.isPinned);

    if (pinned === null) {
      return sendError(res, 400, "isPinned must be true or false");
    }

    const notes = await Note.find({ isPinned: pinned }).sort({ createdAt: -1 });
    const message = pinned
      ? "Fetched all pinned notes"
      : "Fetched all unpinned notes";

    return sendSuccess(res, 200, message, notes, {
      count: notes.length,
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

module.exports = {
  createNote,
  createBulkNotes,
  getAllNotes,
  getNoteById,
  replaceNote,
  updateNote,
  deleteNote,
  deleteBulkNotes,
  getNotesByCategory,
  getNotesByStatus,
};
