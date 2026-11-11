export default function QueryParameters(app) {
  const calculator = (req, res) => {
    const { a, b, operation } = req.query;
    let result = "";
    switch (operation) {
      case "add":
        result = String(parseInt(a) + parseInt(b));
        break;
      case "subtract":
        result = String(parseInt(a) - parseInt(b));
        break;
      case "multiply":
        result = String(parseInt(a) * parseInt(b));
        break;
      case "divide":
        result = String(parseInt(a) / parseInt(b));
        break;
      default:
        result = "Invalid operation";
    }
    res.send(result);
  };
  app.get("/lab5/calculator", calculator);
}