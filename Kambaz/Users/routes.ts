import UsersDao from "./dao";

export default function UserRoutes(app, db) {
  const dao = UsersDao(db);

  const signup = (req, res) => {
    const user = dao.findUserByUsername(req.body.username);
    if (user) {
      res.status(400).json({ message: "Username already in use" });
      return;
    }
    req.session["currentUser"] = dao.createUser(req.body);
    res.json(req.session["currentUser"]);
  };
  const updateUser = (req, res) => {
    const userId = req.params.userId;
    const userUpdates = req.body;
    dao.updateUser(userId, userUpdates);
    req.session["currentUser"] = dao.findUserById(userId);
    res.json(req.session["currentUser"]);
  };
  const signin = (req, res) => {
    const { username, password } = req.body;
    const currentUser = dao.findUserByCredentials(username, password);
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
  const findUsersForCourse = (req, res) => {
    const users = dao.findUsersForCourse(req.params.courseId);
    // Don't send other people's passwords to the browser.
    res.json(users.map(({ password, ...user }) => user));
  };
  app.post("/api/users/profile", profile);
  app.post("/api/users/signout", signout);
  app.put("/api/users/:userId", updateUser);
  app.post("/api/users/signup", signup);
  app.post("/api/users/signin", signin);
  app.get("/api/courses/:courseId/users", findUsersForCourse);
}
