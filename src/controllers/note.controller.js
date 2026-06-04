const mongoose = require("mongoose");
const Note = require("../models/note.model");

const ALLOWED_CATEGORIES = ["work", "personal", "study"];
const ALLOWED_SORT_FIELDS = ["title", "createdAt", "updatedAt", "category"];

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

const validateDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePaginationValue = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
};

const buildPagination = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
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

const getNoteSummary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid note ID");
    }

    const note = await Note.findById(id).select("title category isPinned createdAt");

    if (!note) {
      return sendError(res, 404, "Note not found");
    }

    return sendSuccess(res, 200, "Note summary fetched successfully", note);
  } catch (error) {
    return handleServerError(res, error);
  }
};

const filterNotes = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      if (!validateOptionalCategory(req.query.category, res)) {
        return;
      }

      filter.category = req.query.category;
    }

    if (req.query.isPinned !== undefined) {
      const pinned = parsePinnedValue(req.query.isPinned);

      if (pinned === null) {
        return sendError(res, 400, "isPinned must be true or false");
      }

      filter.isPinned = pinned;
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Notes fetched successfully", notes, {
      count: notes.length,
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

const getPinnedNotes = async (req, res) => {
  try {
    const filter = { isPinned: true };

    if (req.query.category) {
      if (!validateOptionalCategory(req.query.category, res)) {
        return;
      }

      filter.category = req.query.category;
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Pinned notes fetched successfully", notes, {
      count: notes.length,
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

const filterByCategory = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return sendError(res, 400, "Query param 'name' is required");
    }

    if (!validateOptionalCategory(name, res)) {
      return;
    }

    const notes = await Note.find({ category: name }).sort({ createdAt: -1 });

    return sendSuccess(
      res,
      200,
      `Notes filtered by category: ${name}`,
      notes,
      { count: notes.length }
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const filterByDateRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return sendError(res, 400, "Both 'from' and 'to' query params are required");
    }

    const fromDate = validateDate(from);
    const toDate = validateDate(to);

    if (!fromDate || !toDate) {
      return sendError(res, 400, "Invalid date range");
    }

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const notes = await Note.find({
      createdAt: {
        $gte: fromDate,
        $lte: toDate,
      },
    }).sort({ createdAt: -1 });

    return sendSuccess(
      res,
      200,
      `Notes fetched between ${from} and ${to}`,
      notes,
      { count: notes.length }
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const paginateNotes = async (req, res) => {
  try {
    const page = normalizePaginationValue(req.query.page, 1);
    const limit = normalizePaginationValue(req.query.limit, 10);
    const skip = (page - 1) * limit;
    const total = await Note.countDocuments();
    const notes = await Note.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, 200, "Notes fetched successfully", notes, {
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    return handleServerError(res, error);
  }
};

const paginateByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!validateOptionalCategory(category, res)) {
      return;
    }

    const page = normalizePaginationValue(req.query.page, 1);
    const limit = normalizePaginationValue(req.query.limit, 10);
    const skip = (page - 1) * limit;
    const filter = { category };
    const total = await Note.countDocuments(filter);
    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(
      res,
      200,
      `Notes fetched for category: ${category}`,
      notes,
      { pagination: buildPagination(total, page, limit) }
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const sortNotes = async (req, res) => {
  try {
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order || "desc";

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      return sendError(
        res,
        400,
        "Invalid sortBy. Allowed: title, createdAt, updatedAt, category"
      );
    }

    if (!["asc", "desc"].includes(order)) {
      return sendError(res, 400, "order must be asc or desc");
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const notes = await Note.find()
      .sort({ [sortBy]: sortOrder })
      .sort({ _id: 1 });
    const orderLabel = order === "asc" ? "ascending" : "descending";

    return sendSuccess(
      res,
      200,
      `Notes sorted by ${sortBy} in ${orderLabel} order`,
      notes,
      { count: notes.length }
    );
  } catch (error) {
    return handleServerError(res, error);
  }
};

const sortPinnedNotes = async (req, res) => {
  try {
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order || "desc";

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      return sendError(
        res,
        400,
        "Invalid sortBy. Allowed: title, createdAt, updatedAt, category"
      );
    }

    if (!["asc", "desc"].includes(order)) {
      return sendError(res, 400, "order must be asc or desc");
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const notes = await Note.find({ isPinned: true })
      .sort({ [sortBy]: sortOrder })
      .sort({ _id: 1 });
    const orderLabel = order === "asc" ? "ascending" : "descending";

    return sendSuccess(
      res,
      200,
      `Pinned notes sorted by ${sortBy} in ${orderLabel} order`,
      notes,
      { count: notes.length }
    );
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
  getNoteSummary,
  filterNotes,
  getPinnedNotes,
  filterByCategory,
  filterByDateRange,
  paginateNotes,
  paginateByCategory,
  sortNotes,
  sortPinnedNotes,
};
