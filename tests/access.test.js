const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const workerModel = require("../models/workerModel");

describe("access control", () => {
  before(h.startDb);
  after(h.stopDb);
  beforeEach(h.clearDb);

  it("requires a token for protected routes", async () => {
    await h.api().get("/fetchUserData").expect(401);
    await h.api().get("/admin/getIncome").expect(401);
  });

  it("does not let a client token use admin routes", async () => {
    const token = await h.signupUser();
    const res = await h.api().get("/admin/adminFetchUsers").set(h.auth(token)).expect(403);
    assert.match(res.body.message, /do not have access/);
  });

  it("does not let a client token use worker routes, or the reverse", async () => {
    const adminToken = await h.createAdmin();
    await h.createCategory();
    const userToken = await h.signupUser();
    const workerToken = await h.signupWorker(adminToken);

    await h.api().get("/fetchWorkerData").set(h.auth(userToken)).expect(403);
    await h.api().get("/fetchUserData").set(h.auth(workerToken)).expect(403);
  });

  it("keeps unverified workers out until an admin approves them", async () => {
    await h.createCategory();
    let req = h.api().post("/workerSignup");
    const fields = {
      firstName: "Ravi",
      lastName: "M",
      email: "new-worker@example.com",
      password: "secret123",
      department: "Electrician",
      phoneNo: "9123456780",
      district: "Kochi",
    };
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    await req
      .attach("file", Buffer.from("x"), { filename: "id.jpg", contentType: "image/jpeg" })
      .expect(200);
    await h
      .api()
      .post("/workerOtpProcess")
      .send({ email: fields.email, otp: h.sentOtps.get(fields.email) })
      .expect(201);

    const res = await h
      .api()
      .post("/workerLogin")
      .send({ email: fields.email, password: fields.password })
      .expect(403);
    assert.match(res.body.message, /verification/);
  });

  it("requires an ID proof file to sign up as a worker", async () => {
    await h
      .api()
      .post("/workerSignup")
      .field("email", "x@example.com")
      .expect(400);
  });

  it("hides private worker fields on public endpoints", async () => {
    const adminToken = await h.createAdmin();
    const category = await h.createCategory();
    await h.signupWorker(adminToken);
    const worker = await workerModel.findOne();

    const list = await h.api().get(`/fetchWorkers/${category._id}`).expect(200);
    const detail = await h.api().get(`/fetchWorkerDetails/${worker._id}`).expect(200);

    for (const data of [list.body.data[0], detail.body.data]) {
      for (const field of ["password", "proof", "file", "requests", "income"]) {
        assert.equal(data[field], undefined, `${field} should not be exposed`);
      }
    }
  });

  it("only gives admins a signed link to a worker's ID proof", async () => {
    const adminToken = await h.createAdmin();
    await h.createCategory();
    const workerToken = await h.signupWorker(adminToken);
    const worker = await workerModel.findOne();

    await h.api().get(`/admin/adminViewProof/${worker._id}`).set(h.auth(workerToken)).expect(403);
    const res = await h
      .api()
      .get(`/admin/adminViewProof/${worker._id}`)
      .set(h.auth(adminToken))
      .expect(200);
    assert.equal(res.body.url, "https://example.com/signed-proof");
  });

  it("returns 400 for a malformed id and 404 for an unknown route", async () => {
    await h.api().get("/fetchWorkerDetails/not-an-id").expect(400);
    await h.api().get("/does-not-exist").expect(404);
  });
});
