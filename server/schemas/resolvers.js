const { AuthenticationError } = require("apollo-server-express");
const { User, Pet, Status } = require("../models");
const { findById } = require("../models/User");
const { signToken } = require("../utils/auth");

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const user = await User.findById(context.user._id)
          .populate("pets")
          .populate("status");

        return user;
      }

      throw new AuthenticationError("Not logged in");
    },
    pets: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Pet.find(params);
    },
    status: async (parent, { username }) => {
      const params = username ? { username } : {};
      console.log(params);
      return Status.find(params);
    },
  },
  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);

      return { token, user };
    },

    updateUser: async (parent, args, context) => {
      if (context.user) {
        return await User.findByIdAndUpdate(context.user._id, args, {
          new: true,
        });
      }

      throw new AuthenticationError("Not logged in");
    },

    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError("Incorrect credentials");
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Incorrect credentials");
      }

      const token = signToken(user);

      return { token, user };
    },

    addPet: async (parent, args, context) => {
      if (context.user) {
        const pet = await Pet.create({
          ...args,
          username: context.user.username,
        });
        console.log(pet);
        await User.findByIdAndUpdate(
          { _id: context.user._id },
          {
            $push: {
              pets: pet,
            },
          },
          { new: true }
        );

        return pet;
      }

      throw new AuthenticationError("Not logged in");
    },

    updatePet: async (parent, args, context) => {
      if (context.user) {
        const updatedPet = await Pet.findOneAndUpdate(
          { _id: args.petId },
          {
            name: args.name,
            age: args.age,
            gender: args.gender,
            breed: args.breed,
          },
          { new: true }
        );

        return updatedPet;
      }

      throw new AuthenticationError("You need to be logged in!");
    },

    deletePet: async (parent, { petId }, context) => {
      if (context.user) {
        const deletedPet = await Pet.findByIdAndRemove({ _id: petId });

        return deletedPet;
      }
      throw new AuthenticationError("You need to be logged in!");
    },

    //Note: WE only want one status per user to be created, then continuously updated
    addStatus: async (parent, args, context) => {
      if (context.user) {
        const status = await Status.create({
          ...args,
          username: context.user.username,
        });
        console.log(status);
        await User.findByIdAndUpdate(
          { _id: context.user._id },
          { status: status._id },
          { new: true }
        );
        return status;
      }
      throw new AuthenticationError("you need to be logged in!");
    },
    updateStatus: async (parent, { statusId, statusText }, context) => {
      if (context.user) {
        const status = await Status.findByIdAndUpdate(
          { _id: statusId },
          { statusText: statusText },
          { new: true }
        );
        return status;
      }
      throw new AuthenticationError("you need to be logged in!");
    },
    addComment: async (parent, { statusId, commentText }, context) => {
      if (context.user) {
        const updatedStatus = await Status.findOneAndUpdate(
          { _id: statusId },
          {
            $push: {
              comments: { commentText, username: context.user.username },
            },
          },
          { new: true }
        );
        return updatedStatus;
      }
      throw new AuthenticationError("You need to be logged in!");
    },
    deleteComment: async (parent, { statusId, _id }, context) => {
      if (context.user) {
        const deletedComment = await Status.findOneAndUpdate(
          { _id: statusId },
          {
            $pull: {
              comments: { _id: _id },
            },
          },
          { new: true }
        );
        return deletedComment;
      }
      throw new AuthenticationError("You need to be logged in!");
    },
  },
};

module.exports = resolvers;
