const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const h = require("./helpers");
const userModel = require("../models/userModel");
const workerModel = require("../models/workerModel");
const adminModel = require("../models/adminModel");

const sign = (orderId, paymentId) =>
  crypto.createHmac("sha256", "rzp_test_secret").update(`${orderId}|${paymentId}`).digest("hex");

describe("hire → work → payment flow", () => {
  let adminToken, userToken, workerToken, clientId, workerId;

  before(h.startDb);
  after(h.stopDb);
  beforeEach(async () => {
    await h.clearDb();
    adminToken = await h.createAdmin();
    await h.createCategory();
    userToken = await h.signupUser();
    workerToken = await h.signupWorker(adminToken);
    clientId = (await userModel.findOne())._id.toString();
    workerId = (await workerModel.findOne())._id.toString();
  });

  const hire = () =>
    h
      .api()
      .post(`/hireWorker/${workerId}`)
      .set(h.auth(userToken))
      .field("description", "Fix the wiring")
      .field("date", "2026-12-01");

  async function hireAndAccept() {
    await hire().expect(201);
    const { body } = await h.api().get("/fetchUserRequest").set(h.auth(workerToken)).expect(200);
    await h
      .api()
      .put("/workAccept")
      .set(h.auth(workerToken))
      .send({ id: body.requests[0]._id })
      .expect(200);
  }

  async function completeAndBill(amount = 1000) {
    await hireAndAccept();
    await h
      .api()
      .put(`/updateWorkProgress/${clientId}`)
      .set(h.auth(workerToken))
      .send({ progress: 100 })
      .expect(200);
    await h
      .api()
      .post(`/postAmount/${clientId}`)
      .set(h.auth(workerToken))
      .send({ selectedType: "normal", type: "full", amount })
      .expect(200);
  }

  it("returns 409 when the same client hires the same worker twice", async () => {
    await hire().expect(201);
    await hire().expect(409);
  });

  it("gives the worker the client's contact details but not their password", async () => {
    await hire().expect(201);
    const { body } = await h.api().get("/fetchUserRequest").set(h.auth(workerToken)).expect(200);
    const client = body.requests[0].userInfo;
    assert.equal(client.email, "client@example.com");
    assert.equal(client.password, undefined);
  });

  it("starts tracking progress for the client when the worker accepts", async () => {
    await hireAndAccept();
    const res = await h.api().get(`/getProgressValue/${workerId}`).set(h.auth(userToken)).expect(200);
    assert.equal(res.body.data, 0);
  });

  it("stops a worker from updating a client they do not work for", async () => {
    const otherWorker = await h.signupWorker(adminToken, { email: "other@example.com" });
    await hireAndAccept();
    await h
      .api()
      .put(`/updateWorkProgress/${clientId}`)
      .set(h.auth(otherWorker))
      .send({ progress: 50 })
      .expect(403);
  });

  it("refuses to bill before the work is completed", async () => {
    await hireAndAccept();
    await h
      .api()
      .post(`/postAmount/${clientId}`)
      .set(h.auth(workerToken))
      .send({ selectedType: "normal", type: "full", amount: 500 })
      .expect(422);
  });

  it("charges the amount stored on the server, not one sent by the browser", async () => {
    await completeAndBill(1000);
    const res = await h
      .api()
      .post("/razorpay")
      .set(h.auth(userToken))
      .send({ workerId, data: 1 })
      .expect(201);
    assert.equal(res.body.value.amount, 100000);
  });

  it("does not mark work as paid just because an order was created", async () => {
    await completeAndBill(1000);
    await h.api().post("/razorpay").set(h.auth(userToken)).send({ workerId }).expect(201);
    const client = await userModel.findById(clientId);
    assert.equal(client.payment[0].status, "pending");
  });

  it("rejects a payment with an invalid Razorpay signature", async () => {
    await completeAndBill(1000);
    const { body } = await h.api().post("/razorpay").set(h.auth(userToken)).send({ workerId });
    await h
      .api()
      .post("/razorpay/verify")
      .set(h.auth(userToken))
      .send({
        workerId,
        razorpay_order_id: body.value.id,
        razorpay_payment_id: "pay_1",
        razorpay_signature: "forged",
      })
      .expect(400);
  });

  it("credits 90% to the worker and 10% to admin once, after a verified payment", async () => {
    await completeAndBill(1000);
    const { body } = await h.api().post("/razorpay").set(h.auth(userToken)).send({ workerId });
    const verify = {
      workerId,
      razorpay_order_id: body.value.id,
      razorpay_payment_id: "pay_1",
      razorpay_signature: sign(body.value.id, "pay_1"),
    };

    await h.api().post("/razorpay/verify").set(h.auth(userToken)).send(verify).expect(200);
    // Replaying the same confirmation must not credit the money twice.
    await h.api().post("/razorpay/verify").set(h.auth(userToken)).send(verify).expect(409);

    const [worker, admin, client] = await Promise.all([
      workerModel.findById(workerId),
      adminModel.findOne(),
      userModel.findById(clientId),
    ]);
    assert.equal(worker.income, 900);
    assert.equal(admin.income, 100);
    assert.equal(client.payment[0].status, "completed");
    assert.equal(worker.requests[0].paymentStatus, "completed");
  });

  it("only lets a client rate a worker they hired, once", async () => {
    await h
      .api()
      .post(`/rating/${workerId}`)
      .set(h.auth(userToken))
      .send({ starValue: 5, comment: "Great" })
      .expect(403);

    await hireAndAccept();
    await h
      .api()
      .post(`/rating/${workerId}`)
      .set(h.auth(userToken))
      .send({ starValue: 5, comment: { comment: "Great" } })
      .expect(201);
    await h
      .api()
      .post(`/rating/${workerId}`)
      .set(h.auth(userToken))
      .send({ starValue: 4, comment: "Again" })
      .expect(409);

    const res = await h.api().get(`/showRating/${workerId}`).expect(200);
    assert.equal(res.body.rating[0].comment, "Great");
    assert.equal(res.body.rating[0].userRef.password, undefined);
  });

  it("lets a client report a worker once", async () => {
    await h
      .api()
      .post(`/reportWorker/${workerId}`)
      .set(h.auth(userToken))
      .send({ reason: "Did not show up" })
      .expect(201);
    await h
      .api()
      .post(`/reportWorker/${workerId}`)
      .set(h.auth(userToken))
      .send({ reason: "Again" })
      .expect(409);

    const res = await h.api().get("/admin/getComplaints").set(h.auth(adminToken)).expect(200);
    assert.equal(res.body.complaints.length, 1);
  });
});
