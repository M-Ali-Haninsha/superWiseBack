const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const h = require("./helpers");
const userModel = require("../models/userModel");

describe("authentication", () => {
  before(h.startDb);
  after(h.stopDb);
  beforeEach(h.clearDb);

  const signupBody = {
    firstName: "Asha",
    lastName: "K",
    email: "Client@Example.com",
    password: "secret123",
    phoneNo: "9876543210",
    location: "Kochi",
  };

  it("signs up a client only after the emailed OTP is confirmed", async () => {
    await h.api().post("/userSignup").send(signupBody).expect(200);
    assert.equal(await userModel.countDocuments(), 0);

    const otp = h.sentOtps.get("client@example.com");
    assert.match(otp, /^\d{4}$/);

    await h
      .api()
      .post("/userOtp")
      .send({ email: "client@example.com", otp })
      .expect(201);
    assert.equal(await userModel.countDocuments(), 1);
  });

  it("rejects a wrong OTP and locks out after 5 attempts", async () => {
    await h.api().post("/userSignup").send(signupBody).expect(200);
    const otp = h.sentOtps.get("client@example.com");
    const wrong = otp === "0000" ? "1111" : "0000";

    for (let i = 0; i < 5; i++) {
      const res = await h
        .api()
        .post("/userOtp")
        .send({ email: "client@example.com", otp: wrong })
        .expect(400);
      assert.equal(res.body.message, "Invalid OTP");
    }
    // Even the right OTP no longer works once the attempts are used up.
    await h.api().post("/userOtp").send({ email: "client@example.com", otp }).expect(400);
  });

  it("keeps concurrent signups separate", async () => {
    await h.api().post("/userSignup").send(signupBody).expect(200);
    await h
      .api()
      .post("/userSignup")
      .send({ ...signupBody, email: "other@example.com" })
      .expect(200);

    await h
      .api()
      .post("/userOtp")
      .send({ email: "client@example.com", otp: h.sentOtps.get("client@example.com") })
      .expect(201);
    await h
      .api()
      .post("/userOtp")
      .send({ email: "other@example.com", otp: h.sentOtps.get("other@example.com") })
      .expect(201);
    assert.equal(await userModel.countDocuments(), 2);
  });

  it("returns 409 for an email that is already registered", async () => {
    await h.signupUser();
    const res = await h.api().post("/userSignup").send(signupBody).expect(409);
    assert.match(res.body.message, /already exists/);
  });

  it("returns 400 with the failing field for invalid input", async () => {
    const res = await h
      .api()
      .post("/userSignup")
      .send({ ...signupBody, password: "123" })
      .expect(400);
    assert.match(res.body.message, /^password:/);
  });

  it("issues a token holding only the id and role", async () => {
    const token = await h.signupUser();
    const payload = h.decode(token);
    assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
    assert.equal(payload.role, "user");
  });

  it("returns 401 for a wrong password without saying which field was wrong", async () => {
    await h.signupUser();
    const res = await h
      .api()
      .post("/userLogin")
      .send({ email: "client@example.com", password: "wrong-pass" })
      .expect(401);
    assert.equal(res.body.message, "Invalid email or password");
  });

  it("never returns the password hash", async () => {
    const token = await h.signupUser();
    const res = await h.api().get("/fetchUserData").set(h.auth(token)).expect(200);
    assert.equal(res.body.fetchedData.password, undefined);
  });

  it("stops a blocked client at login and on existing sessions", async () => {
    const adminToken = await h.createAdmin();
    const token = await h.signupUser();
    const { _id } = await userModel.findOne();

    await h
      .api()
      .post("/admin/adminBlockUser")
      .set(h.auth(adminToken))
      .send({ id: _id.toString() })
      .expect(200);

    await h.api().get("/fetchUserData").set(h.auth(token)).expect(403);
    await h
      .api()
      .post("/userLogin")
      .send({ email: "client@example.com", password: "secret123" })
      .expect(403);
  });

  it("reports an expired token as an expired session", async () => {
    const token = jwt.sign({ sub: "64d7727f79d4bf0c4c8fd057", role: "user" }, "test-secret", {
      expiresIn: -10,
    });
    const res = await h.api().get("/fetchUserData").set(h.auth(token)).expect(401);
    assert.equal(res.body.message, "session has expired");
  });
});
