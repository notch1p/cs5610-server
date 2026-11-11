let todos = [
  { id: 1, title: "Task 1", completed: false, description: "desc1" },
  { id: 2, title: "Task 2", completed: true, description: "desc2" },
  { id: 3, title: "Task 3", completed: false, description: "desc3" },
  { id: 4, title: "Task 4", completed: true, description: "desc4" },
];
export default function WorkingWithRemoteArrays(app) {
  const getTodos = (req, res) => {
    const { completed } = req.query;
    if (completed !== undefined) {
      const completedBool = completed === "true";
      res.json(todos.filter((t) => t.completed === completedBool));
      return;
    }
    res.json(todos);
  };
  const getTodoById = (req, res) => {
    const { id } = req.params;
    const todo = todos.find((t) => t.id === parseInt(id));
    res.json(todo);
  };
  const createNewTodo = (req, res) => {
    const time = new Date().getTime();
    const newTodo = {
      id: time,
      title: "New Task",
      completed: false,
      description: `desc-${time}`,
    };
    todos.push(newTodo);
    res.json(todos);
  };
  const removeTodo = (req, res) => {
    const { id } = req.params;
    const todoIndex = todos.findIndex((t) => t.id === parseInt(id));
    todos.splice(todoIndex, 1);
    res.json(todos);
  };
  const updateTodoTitle = (req, res) => {
    const { id, title } = req.params;
    const todo = todos.find((t) => t.id === parseInt(id));
    todo.title = title;
    res.json(todos);
  };
  const setTodoComplete = (req, res) => {
    const { id, completed } = req.params;
    const todo = todos.map((t) =>
      t.id === parseInt(id) ? { ...t, completed } : t,
    );
    res.json(todo);
  };
  const updateTodoDesc = (req, res) => {
    const { id, description } = req.params;
    const todo = todos.find((t) => t.id === parseInt(id));
    todo.description = description;
    res.json(todos);
  };
  const postNewTodo = (req, res) => {
    const newTodo = { ...req.body, id: new Date().getTime() };
    todos.push(newTodo);
    res.json(newTodo);
  };
  const deleteTodo = (req, res) => {
    const { id } = req.params;
    const todoIndex = todos.findIndex((t) => t.id === parseInt(id));
    if (todoIndex === -1) {
      res.status(404).json({ message: `Unable to delete Todo with ID ${id}` });
      return;
    }
    todos.splice(todoIndex, 1);
    res.sendStatus(200);
  };
  const updateTodo = (req, res) => {
    const { id } = req.params;
    const todoIndex = todos.findIndex((t) => t.id === parseInt(id));
    if (todoIndex === -1) {
      res.status(404).json({ message: `Unable to update Todo with ID ${id}` });
      return;
    }
    todos = todos.map((t) =>
      t.id === parseInt(id) ? { ...t, ...req.body } : t,
    );
    res.sendStatus(200);
  };
  app.put("/lab5/todos/:id", updateTodo);
  app.delete("/lab5/todos/:id", deleteTodo);
  app.get("/lab5/todos/:id/delete", removeTodo);
  app.get("/lab5/todos/create", createNewTodo);
  app.post("/lab5/todos", postNewTodo);
  app.get("/lab5/todos/:id/title/:title", updateTodoTitle);
  app.get("/lab5/todos/:id/delete", removeTodo);
  app.get("/lab5/todos/create", createNewTodo);
  app.get("/lab5/todos/:id", getTodoById);
  app.get("/lab5/todos", getTodos);
  app.get("/lab5/todos/:id/completed/:completed", setTodoComplete);
  app.get("/lab5/todos/:id/description/:description", updateTodoDesc);
}
