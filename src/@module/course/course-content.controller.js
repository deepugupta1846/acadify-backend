const courseContentService = require('./course-content.service');

const listContent = async (req, res, next) => {
  try {
    const data = await courseContentService.listContent(
      req.params.id,
      req.user
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getContent = async (req, res, next) => {
  try {
    const data = await courseContentService.getContentById(
      req.params.id,
      req.params.contentId,
      req.user
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const createContent = async (req, res, next) => {
  try {
    const data = await courseContentService.createContent(
      req.params.id,
      req.user,
      req.body,
      req.file
    );

    return res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data
    });
  } catch (error) {
    return next(error);
  }
};

const updateContent = async (req, res, next) => {
  try {
    const data = await courseContentService.updateContent(
      req.params.id,
      req.params.contentId,
      req.user,
      req.body,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data
    });
  } catch (error) {
    return next(error);
  }
};

const deleteContent = async (req, res, next) => {
  try {
    await courseContentService.deleteContent(
      req.params.id,
      req.params.contentId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const downloadContent = async (req, res, next) => {
  try {
    const file = await courseContentService.downloadContent(
      req.params.id,
      req.params.contentId,
      req.user
    );

    const safeName = encodeURIComponent(file.fileName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`
    );
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');

    if (file.contentLength) {
      res.setHeader('Content-Length', String(file.contentLength));
    }

    file.stream.pipe(res);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  downloadContent
};
