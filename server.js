const express = require("express");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.static("public", { index: false }));
app.use("/", routes);

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
