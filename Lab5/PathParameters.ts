export default function PathParameters(app) {
  const add = (req, res) => {
    const { a, b } = req.params;
    const sum = parseInt(a) + parseInt(b);
    res.send(sum.toString());
  };
  const sub = (req, res) => {
    const { a, b } = req.params;
    res.send((parseInt(a) - parseInt(b)).toString());
  };
  const mul = (req, res) => {
    const { a, b } = req.params;
    res.send((parseInt(a) * parseInt(b)).toString());
  };
  const div = (req, res) => {
    const { a, b } = req.params;
    res.send((parseInt(a) / parseInt(b)).toString());
  };
  app.get("/lab5/add/:a/:b", add);
  app.get("/lab5/subtract/:a/:b", sub);
  app.get("/lab5/multiply/:a/:b", mul);
  app.get("/lab5/divide/:a/:b", div);
}
