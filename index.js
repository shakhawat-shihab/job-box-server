require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q66zrl2.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb://localhost:27017`
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("jobbox");
    const userCollection = db.collection("user");
    const jobCollection = db.collection("job");

    app.post("/user", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;

      const result = await userCollection.findOne({ email });

      // console.log(email, result);
      if (result?.email) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/apply", async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: { applicants: { id: ObjectId(userId), email } },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);

      // console.log('fg ', result)
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/query", async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const question = req.body.question;
      const time = req.body.time;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          queries: {
            id: ObjectId(userId),
            email,
            question: question,
            time: time,
            reply: [],
          },
        },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);

      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/reply", async (req, res) => {
      const userId = req.body.userId;
      const reply = req.body.reply;
      const time = req.body.time;
      const jobId = req.body.jobId;
      console.log(reply);
      console.log(userId);
      console.log(time);

      // const filter = { "queries.id": ObjectId(userId), "queries.time": time };
      const filter = { _id: ObjectId(jobId) };

      const updateDoc = {
        $push: {
          "queries.$[user].reply": reply,
        },
      };
      const arrayFilter = {
        arrayFilters: [{ "user.id": ObjectId(userId), "user.time": time }],
      };

      const result = await jobCollection.updateOne(
        filter,
        updateDoc,
        arrayFilter
      );
      console.log('result ==', result)
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.get("/applied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { applicants: { $elemMatch: { email: email } } };
      const cursor = jobCollection.find(query).project({ applicants: 0 });
      const result = await cursor.toArray();

      res.send({ status: true, data: result });
    });

    app.get("/my-jobs/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { employerEmail: email };
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });



    app.get("/jobs", async (req, res) => {
      const cursor = jobCollection.find({});
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.findOne({ _id: ObjectId(id) });
      res.send({ status: true, data: result });
    });

    app.patch("/job/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.updateOne({ _id: ObjectId(id) }, { $set: { isClosed: true } });
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });

    app.post("/job", async (req, res) => {
      const { employerId, ...all } = req.body;
      const job = { ...all, employerId: ObjectId(employerId) }

      const result = await jobCollection.insertOne(job);
      res.send({ status: true, data: result });
    });


  } finally {

  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
