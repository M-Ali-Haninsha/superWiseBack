// One-off migration: emails are now matched in lowercase, so lowercase any
// stored emails that contain capitals. Safe to run more than once.
// Usage: node scripts/normalize-emails.js
const mongoose = require("mongoose");
const config = require("../config/env");

async function main() {
  await mongoose.connect(config.databaseUrl);
  const db = mongoose.connection.db;

  for (const name of ["userdatas", "workerdatas", "admindatas"]) {
    const result = await db
      .collection(name)
      .updateMany({ email: { $regex: "[A-Z]" } }, [
        { $set: { email: { $toLower: { $trim: { input: "$email" } } } } },
      ]);
    console.log(`${name}: lowercased ${result.modifiedCount} email(s)`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
