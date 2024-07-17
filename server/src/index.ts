import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User";
import { StreamChat } from "stream-chat";

dotenv.config();

const { PORT, STREAM_API_KEY, STREAM_API_SEVRET } = process.env;
const client = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SEVRET);

const app = express();
app.use(express.json());

const dbName = process.env.DBNAME;

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.info(
      `Trying to register for a new user with email: ${email} and password: ${password}`
    );
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exist" });
    }

    const salt = await bcrypt.genSalt();
    const saltPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      email,
      password: saltPassword,
    });

    await client.upsertUser({
      id: newUser.id,
      email,
      name: email,
    });

    const token = client.createToken(newUser.id);

    return res.status(200).json({
      token,
      user: {
        id: newUser.id,
        email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Authentication failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.info(
      `Trying to login with email ${email} and password ${password}`
    );
    const user = await User.findOne({ email });
    if (!user) {
      console.info("email or password incorrect1");
      return res.status(401).json({ msg: "email or password incorrect" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.info("email or password incorrect2");
      return res.status(401).json({ msg: "email or password incorrect" });
    }
    const token = client.createToken(user.id);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Authentication failed" });
  }
});

mongoose
  .connect(process.env.MONGO_URL!, { dbName })
  .then(() => {
    app.listen(PORT, () =>
      console.info(`Server is listening on port: ${PORT}`)
    );
  })
  .catch((error) => console.log(`${error} did not connect`));
