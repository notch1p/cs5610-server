import PathParameters from "./PathParameters";
import QueryParameters from "./QueryParameters";
import WorkingWithRemoteArrays from "./WorkingWithRemoteArrays";
import WorkingWithRemoteObjects from "./WorkingWithRemoteObjects";

export default function Lab5(app) {
  app.get("/lab5/welcome", (req, res) => {
    res.send("Welcome to Lab 5");
  });
  PathParameters(app);
  QueryParameters(app);
  WorkingWithRemoteObjects(app);
  WorkingWithRemoteArrays(app);
}
