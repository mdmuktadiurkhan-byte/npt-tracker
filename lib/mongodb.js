import { MongoClient } from "mongodb";

const uri = "mongodb+srv://npttracker:1234567890@cluster0.cxdojoi.mongodb.net/?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true";

if (!uri) {
  throw new Error("Please add MONGODB_URI to .env.local");
}

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // Use a global variable to avoid re-creating client on hot reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;