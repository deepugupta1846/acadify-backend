const db = require('../../connection');
const uploadService = require('../storage/upload.service');

const Course = db.course;
const CourseContent = db.courseContent;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const VALID_TYPES = ['lesson', 'video', 'attachment'];

const ensureAcademyAccess = (user) => {
  if (!user.academyId) {
    const error = new Error(
      'Your account is not linked to an academy. Contact admin.'
    );
    error.status = 403;
    throw error;
  }

  return user.academyId;
};

const ensureCourseAccess = async (courseId, user) => {
  const academyId = ensureAcademyAccess(user);
  const course = await Course.findOne({
    where: { id: courseId, academyId }
  });

  if (!course) {
    const error = new Error('Course not found');
    error.status = 404;
    throw error;
  }

  return course;
};

const getContentForCourse = async (courseId, contentId, user) => {
  const course = await ensureCourseAccess(courseId, user);
  const item = await CourseContent.findOne({
    where: { id: contentId, courseId: course.id }
  });

  if (!item) {
    const error = new Error('Content not found');
    error.status = 404;
    throw error;
  }

  return item;
};

const formatContent = (row) => {
  const plain = row.toJSON ? row.toJSON() : row;
  return {
    id: plain.id,
    courseId: plain.courseId,
    type: plain.type,
    title: plain.title,
    content: plain.content,
    videoUrl: plain.videoUrl,
    fileName: plain.fileName,
    mimeType: plain.mimeType,
    fileSize: plain.fileSize,
    sortOrder: plain.sortOrder,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const nextSortOrder = async (courseId) => {
  const max = await CourseContent.max('sortOrder', { where: { courseId } });
  return Number.isFinite(max) ? max + 1 : 0;
};

const validateType = (type) => {
  if (!VALID_TYPES.includes(type)) {
    const error = new Error(
      `Invalid content type. Allowed: ${VALID_TYPES.join(', ')}`
    );
    error.status = 400;
    throw error;
  }
};

const listContent = async (courseId, user) => {
  await ensureCourseAccess(courseId, user);

  const items = await CourseContent.findAll({
    where: { courseId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC']
    ]
  });

  return items.map(formatContent);
};

const getContentById = async (courseId, contentId, user) => {
  const item = await getContentForCourse(courseId, contentId, user);
  return formatContent(item);
};

const createContent = async (courseId, user, payload, file) => {
  const course = await ensureCourseAccess(courseId, user);
  const type = payload.type === 'video' || payload.type === 'attachment'
    ? payload.type
    : 'lesson';
  validateType(type);

  const title = payload.title?.trim();
  if (!title) {
    const error = new Error('Title is required');
    error.status = 400;
    throw error;
  }

  const sortOrder = await nextSortOrder(course.id);

  if (type === 'lesson') {
    const content = payload.content?.trim();
    if (!content) {
      const error = new Error('Lesson content is required');
      error.status = 400;
      throw error;
    }

    const item = await CourseContent.create({
      courseId: course.id,
      academyId: course.academyId,
      createdBy: user.id,
      type: 'lesson',
      title,
      content,
      sortOrder
    });

    return formatContent(item);
  }

  if (type === 'video') {
    const videoUrl = payload.videoUrl?.trim();
    if (!videoUrl) {
      const error = new Error('Video URL is required');
      error.status = 400;
      throw error;
    }

    const item = await CourseContent.create({
      courseId: course.id,
      academyId: course.academyId,
      createdBy: user.id,
      type: 'video',
      title,
      content: payload.content?.trim() || null,
      videoUrl,
      sortOrder
    });

    return formatContent(item);
  }

  if (!file) {
    const error = new Error('File is required for attachments');
    error.status = 400;
    throw error;
  }

  if (file.size > MAX_FILE_SIZE) {
    const error = new Error('File size must be 15 MB or less');
    error.status = 400;
    throw error;
  }

  const uploaded = await uploadService.uploadBuffer({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    folder: `course-content/course-${course.id}`
  });

  const item = await CourseContent.create({
    courseId: course.id,
    academyId: course.academyId,
    createdBy: user.id,
    type: 'attachment',
    title,
    content: payload.content?.trim() || null,
    fileName: file.originalname,
    filePath: uploaded.filePath,
    fileUrl: uploaded.fileUrl,
    mimeType: file.mimetype,
    fileSize: file.size,
    sortOrder
  });

  return formatContent(item);
};

const updateContent = async (courseId, contentId, user, payload, file) => {
  const item = await getContentForCourse(courseId, contentId, user);

  const title = payload.title?.trim() ?? item.title;
  if (!title) {
    const error = new Error('Title is required');
    error.status = 400;
    throw error;
  }

  const updates = {
    title,
    content:
      payload.content !== undefined
        ? payload.content?.trim() || null
        : item.content
  };

  if (item.type === 'video') {
    const videoUrl =
      payload.videoUrl !== undefined
        ? payload.videoUrl?.trim()
        : item.videoUrl;
    if (!videoUrl) {
      const error = new Error('Video URL is required');
      error.status = 400;
      throw error;
    }
    updates.videoUrl = videoUrl;
  }

  if (item.type === 'lesson') {
    const content =
      payload.content !== undefined
        ? payload.content?.trim()
        : item.content;
    if (!content) {
      const error = new Error('Lesson content is required');
      error.status = 400;
      throw error;
    }
    updates.content = content;
  }

  if (item.type === 'attachment' && file) {
    if (file.size > MAX_FILE_SIZE) {
      const error = new Error('File size must be 15 MB or less');
      error.status = 400;
      throw error;
    }

    const uploaded = await uploadService.uploadBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      folder: `course-content/course-${item.courseId}`
    });

    updates.fileName = file.originalname;
    updates.filePath = uploaded.filePath;
    updates.fileUrl = uploaded.fileUrl;
    updates.mimeType = file.mimetype;
    updates.fileSize = file.size;
  }

  await item.update(updates);
  return formatContent(item);
};

const deleteContent = async (courseId, contentId, user) => {
  const item = await getContentForCourse(courseId, contentId, user);
  await item.destroy();
  return { id: contentId };
};

const downloadContent = async (courseId, contentId, user) => {
  const item = await getContentForCourse(courseId, contentId, user);

  if (item.type !== 'attachment' || !item.filePath) {
    const error = new Error('Attachment not found');
    error.status = 404;
    throw error;
  }

  const file = await uploadService.downloadFile(item.filePath);

  return {
    stream: file.stream,
    fileName: item.fileName || 'attachment',
    mimeType: item.mimeType || file.contentType,
    contentLength: file.contentLength
  };
};

module.exports = {
  listContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  downloadContent
};
