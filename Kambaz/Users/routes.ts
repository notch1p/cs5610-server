import UsersDao from "./dao";

export default function UserRoutes(app) {
  const dao = UsersDao();

  const signup = async (req, res) => {
    const user = await dao.findUserByUsername(req.body.username);
    if (user) {
      res.status(400).json({ message: "Username already in use" });
      return;
    }
    req.session["currentUser"] = await dao.createUser(req.body);
    res.json(req.session["currentUser"]);
  };
  const updateUser = async (req, res) => {
    const { userId } = req.params;
    const userUpdates = req.body;
    await dao.updateUser(userId, userUpdates);
    const currentUser = req.session["currentUser"];
    if (currentUser && currentUser._id === userId) {
      req.session["currentUser"] = { ...currentUser, ...userUpdates };
    }
    res.json(currentUser);
  };
  const signin = async (req, res) => {
    const { username, password } = req.body;
    const currentUser = await dao.findUserByCredentials(username, password);
    if (currentUser) {
      req.session["currentUser"] = currentUser;
      res.json(currentUser);
    } else {
      res.status(401).json({ message: "Unable to login. Try again later." });
    }
  };
  const profile = (req, res) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    res.json(currentUser);
  };
  const signout = (req, res) => {
    req.session.destroy();
    res.sendStatus(200);
  };
  const findUsersForCourse = async (req, res) => {
    // Passwords are left out because the schema marks them `select: false`.
    res.json(await dao.findUsersForCourse(req.params.courseId));
  };
  const findAllUsers = async (req, res) => {
    const { role, name } = req.query;
    if (role) {
      const users = await dao.findUsersByRole(role);
      res.json(users);
      return;
    }
    if (name) {
      const users = await dao.findUsersByPartialName(name);
      res.json(users);
      return;
    }
    const users = await dao.findAllUsers();
    res.json(users);
  };
  const findUserById = async (req, res) => {
    const user = await dao.findUserById(req.params.userId);
    res.json(user);
  };
  const createUser = async (req, res) => {
    // Same check as signup; otherwise a taken username fails with a 500 from
    // the unique index on `username`.
    if (await dao.findUserByUsername(req.body.username)) {
      res.status(400).json({ message: "Username already in use" });
      return;
    }
    const user = await dao.createUser(req.body);
    res.json(user);
  };
  app.post("/api/users", createUser);
  app.get("/api/users/:userId", findUserById);
  app.get("/api/users", findAllUsers);
  app.post("/api/users/profile", profile);
  app.post("/api/users/signout", signout);
  app.put("/api/users/:userId", updateUser);
  app.post("/api/users/signup", signup);
  app.post("/api/users/signin", signin);
  app.get("/api/courses/:courseId/users", findUsersForCourse);
  app.delete("/api/users/:userId", async (req, res) => {
    const status = await dao.deleteUser(req.params.userId);
    res.json(status);
  });
}
