require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zwiso.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
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
    const chatCollection = db.collection("chat");

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
      const firstName = req.body.firstName;
      const lastName = req.body.lastName;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: { applicants: { id: ObjectId(userId), email, firstName, lastName, status: 'pending' } },
        $inc: { applicationCount: 1 }
      };

      const result = await jobCollection.updateOne(filter, updateDoc);

      // console.log('fg ', result)
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });


    app.patch("/approve-job", async (req, res) => {
      const applicantId = req.body.applicantId;
      const jobId = req.body.jobId;

      const filter = { _id: ObjectId(jobId) };

      const updateDoc = {
        $set: {
          "applicants.$[user].status": "approved",
        },
      };

      const arrayFilter = {
        arrayFilters: [{ "user.id": ObjectId(applicantId) }],
      };

      const result = await jobCollection.updateOne(
        filter,
        updateDoc,
        arrayFilter
      );

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

      //array filter er maddome $[user] er moddhe array er index pass hoitase
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

    app.get("/candidates/:jobId", async (req, res) => {
      const jobId = req.params.jobId;
      const query = { _id: ObjectId(jobId) };
      const result = await jobCollection.findOne(query);
      // const result = await cursor.toArray();

      res.send({ status: true, data: result });
    });

    app.get("/applied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { applicants: { $elemMatch: { email: email } } };
      const cursor = await jobCollection.find(query).project({
        applicants: 1,
        companyName: 1,
        position: 1,
        location: 1,
        experience: 1,
        workLevel: 1,
        employmentType: 1,
        salaryRange: 1,
        skills: 1,
        requirements: 1,
        responsibilities: 1,
        overview: 1,
        queries: 1,
        isClosed: 1,
        applicants: 1,
        employerEmail: 1,
        createdAt: 1,
        _id: 1,
      });
      const result = await cursor.toArray();

      //BANGLA SYSTEM
      const output = result.filter(x => {
        x.applicants?.map(applicant => {
          if (applicant.email == email && applicant.status == "approved") {
            x.status = "approved";
          }
        })
        if (!x.status) {
          x.status = "pending"
        }
        x.applicants = [];
        return x;
      })


      res.send({ status: true, data: output });
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
      const job = { ...all, employerId: ObjectId(employerId), applicationCount: 0 }

      const result = await jobCollection.insertOne(job);
      res.send({ status: true, data: result });
    });


    app.post("/send-message", async (req, res) => {
      const { message, sendAt, sendFrom, sendTo } = req.body;
      const filter1 = { user1: sendFrom, user2: sendTo }
      const filter2 = { user1: sendTo, user2: sendFrom }
      const found = await chatCollection.findOne({ $or: [filter1, filter2] });

      if (found) {
        const updateDoc = {
          $push: { messages: { sendFrom, sendAt, text: message } },
        };
        // console.log(found._id)
        const result = await chatCollection.updateOne({ _id: ObjectId(found._id) }, updateDoc);
        res.send({ status: true, data: result });
      }

      else {
        const doc = {
          user1: sendFrom,
          user2: sendTo,
          messages: [
            {
              sendFrom,
              sendAt,
              text: message
            }
          ]
        }
        const result = await chatCollection.insertOne(doc);
        res.send({ status: true, data: result });
      }
    });


    app.get("/get-messages/:user1/:user2", async (req, res) => {
      //current user er email verfiy korte hobe..
      //current user er email user1 othoba user2 hole, data pathaite hobe... otherwise error message pathaite hbe

      const { user1, user2 } = req.params;
      console.log(user1, user2);
      const filter1 = { user1: user1, user2: user2 }
      const filter2 = { user1: user2, user2: user1 }
      const found = await chatCollection.findOne({ $or: [filter1, filter2] });
      // console.log(found);
      res.send({ status: true, data: found?.messages });
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
