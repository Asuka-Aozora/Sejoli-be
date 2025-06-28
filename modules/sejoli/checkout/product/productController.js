const fn = require("../../../../common/fn");
const m = require("./productModel");

exports.getProduct = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  dt = await m.getProduct(dt);
  console.log("flow:", dt.flow);
  res.status(dt.code).json(fn.setResponse(dt));
};

exports.getProductQuantity = async (req, res) => {
  let dt = { err: false, msg: "", flow: [], code: 200 };
  const { productId } = req.params;
  dt.flow.push(
    `➡️ productController | received request, productId=${productId}`
  );
  dt = await m.getProductQuantity(dt, productId);
  console.log("flow:", dt.flow);
  res.status(dt.code).json(fn.setResponse(dt));
};