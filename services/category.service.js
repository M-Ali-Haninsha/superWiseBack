const categoryModel = require("../models/category");
const uploadService = require("./upload.service");
const { badRequest, notFound, conflict } = require("../utils/httpError");

const list = () => categoryModel.find();

async function add({ categoryName, description }, file) {
  if (!file) throw badRequest("A category image is required");
  if (await categoryModel.exists({ name: categoryName })) {
    throw conflict("A category with this name already exists");
  }
  const Image = await uploadService.uploadImage(file, "categories");
  await categoryModel.create({ name: categoryName, description, Image });
}

async function edit(id, { categoryName, description }, file) {
  const update = { name: categoryName, description };
  if (file) update.Image = await uploadService.uploadImage(file, "categories");
  const result = await categoryModel.updateOne({ _id: id }, { $set: update });
  if (!result.matchedCount) throw notFound("Category not found");
}

module.exports = { list, add, edit };
