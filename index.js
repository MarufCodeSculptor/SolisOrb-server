const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 9000;
const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  opstionSuccessStatus: 200,
};
// midlewere--------
app.use(cors(corsOptions));
app.use(express.json());

app.get('/', async (req, res) => {
  res.send('access to root outsie of the mongodb');
});

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster1.6mzg5rv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const jobCollections = client.db('SolisOrbBase').collection('jobs');
    const bidCollections = client.db('SolisOrbBase').collection('bids');
    // getting all jobs data =>
    app.get('/jobs', async (req, res) => {
      const result = await jobCollections.find().toArray();
      res.send(result);
    });
    // getting a single job data =>
    app.get('/job/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          res.status(400).send('Invalid id format');
        }
        const query = { _id: new ObjectId(id) };
        const result = await jobCollections.findOne(query);
        if (!result) {
          res.status(404).send('data not found');
        }

        console.log(result);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    // getting jobs data by email =>
    app.get('/jobs/:email', async (req, res) => {
      try {
        const email = req.params.email;
        console.log('the email is ', email);
        const query = { 'buyer.email': email };
        const result = await jobCollections.find(query).toArray();
        res.send(result);
        console.log(result);
      } catch (err) {
        console.log(err);
      }
    });

    // posting jobs =>
    app.post('/jobs', async (req, res) => {
      try {
        const data = req.body;
        if (!data) {
          res.status(400).send('Bad requrest data is  not sended');
        }
        if (data) {
          const result = await jobCollections.insertOne(data);
          console.log('data posted');
          res.send(result);
        }
      } catch (err) {
        console.log(err?.message);
      }
    });
    // updating jobs=>
    app.put('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const recievedData = req.body;
      const updateDoc = { $set: { ...recievedData } };
      const options = { upsert: true };
      const result = await jobCollections.updateOne(query, updateDoc, options);
      res.send(result);
    });
    // removing jobs =>
    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollections.deleteOne(query);
      res.send(result);
    });
    // getting all bids =>
    app.get('/bids', async (req, res) => {
      try {
        const result = await bidCollections.find().toArray();
        res.send(result);
      } catch (err) {
        console.log(err?.message);
      }
    });

    // getting users bids by  their emails = >
    app.get('/my-bids/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bidCollections.find(query).toArray();
      res.send(result);
    });
    app.get('/bid-request/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const result = await bidCollections.find(query).toArray();
      res.send(result);
      console.log(result);
    });

    // adding bids =>
    app.post('/bids', async (req, res) => {
      try {
        const data = req.body;
        if (!data) {
          res.status(400).send('bad request data is not sended');
        }
        const result = await bidCollections.insertOne(data);
        console.log('insert to bid collections success');
        res.send(result);
      } catch (err) {
        console.log(err?.message);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    //
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`listening to the  PORT ${PORT}`);
});
