import { v4 as uuidv4 } from "uuid";
import model from "./model";
import enrollmentModel from "../Enrollments/model";

export default function UsersDao() {
  const findAllUsers = () => model.find();
  const findUserById = (userId) => model.findById(userId);
  const findUserByUsername = (username) =>
    model.findOne({ username: username });
  const findUserByCredentials = (username, password) =>
    model.findOne({ username, password });
  const updateUser = (userId, user) =>
    model.updateOne({ _id: userId }, { $set: user });
  const deleteUser = (userId) => model.findByIdAndDelete(userId);
  const createUser = (user) => {
    const newUser = { ...user, _id: uuidv4() };
    return model.create(newUser);
  };
  const findUsersForCourse = async (courseId) => {
    const userIds = await enrollmentModel.distinct("user", {
      course: courseId,
    });
    return model.find({ _id: { $in: userIds } });
  };
  const findUsersByRole = (role) => model.find({ role });
  const findUsersByPartialName = (partialName) => {
    const regex = new RegExp(partialName, "i");
    return model.find({
      $or: [{ firstName: { $regex: regex } }, { lastName: { $regex: regex } }],
    });
  };
  return {
    createUser,
    findAllUsers,
    findUserById,
    findUserByUsername,
    findUserByCredentials,
    findUsersByRole,
    findUsersByPartialName,
    updateUser,
    deleteUser,
    findUsersForCourse,
  };
}
