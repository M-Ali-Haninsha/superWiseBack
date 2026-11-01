// Field selections used when one party's data is shown to another, so that
// private fields (other clients' requests, income, password, ID proof) never
// leave the server. password/proof/file are also `select: false` in the schemas.
module.exports = {
  CLIENT_CONTACT: "firstName lastName email phone location image",
  CLIENT_SUMMARY: "firstName lastName image",
  WORKER_PUBLIC: "-requests -income",
};
