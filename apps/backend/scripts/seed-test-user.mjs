import argon2 from "argon2";

const password = process.env.SEED_PASSWORD ?? "supersecret123";
const hash = await argon2.hash(password);
console.log(hash);
