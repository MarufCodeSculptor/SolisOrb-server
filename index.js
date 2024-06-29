const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 9000;
const corsOptions = {
  origin: ['http://localhost:5173', 'https://solisorb.web.app'],
  credentials: true,
  optionSuccessStatus: 200,
};
// midlewere--------
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// midlewere functions =>
const logger = async (req, res, next) => {
  const loggerInfo =
    req.method +
    '  => ' +
    req.protocol +
    '://' +
    req.get('host') +
    req.originalUrl;
  console.log(loggerInfo);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = await req.cookies?.token;
  console.log('this is token form varify token route', token);
  if (!token) {
    return res.status(400).send('token not found in server');
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send('forbidden! access not permited');
    }
    req.user = decoded;
    next();
  });
};

app.get('/', logger, async (req, res) => {
  res.send('access to root outsie of the mongodb');
});

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
    app.post('/user', logger, async (req, res) => {
      const data = req.body;
      const secret = process.env.TOKEN_SECRET;
      const token = await jwt.sign(data, secret, { expiresIn: '1d' });
      res
        .cookie('token', token, {
          httpOnly: true,
        })
        .send({ success: true });
    });

    app.get('/logout', (req, res) => {
      console.log('logout route called');
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ data: 'cookie clear' });
    });

    // getting all jobs data =>
    app.get('/jobs', logger, async (req, res) => {
      const result = await jobCollections.find().toArray();
      res.send(result);
    });
    // getting alll jogbs by qyery => => =>
    app.get('/all-jobs', logger, async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page);
      const filter = req.query.filter;
      const skip = page * size;
      const sort = req.query.sort;
      const search = req.query.search;
      let query = {
        job_title: {
          $regex: search,
          $options: 'i',
        },
      };
      if (filter) query.category = filter;
      let options = {};
      if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } };
      const result = await jobCollections
        .find(query, options)
        .skip(skip)
        .limit(size)
        .toArray();
      const lengthIs = result.length;
      res.send(result);
    });
    // getting jobs count = >
    app.get('/jobs-count', logger, async (req, res) => {
      const filterIs = req.query.filter;
      const search = req.query.search;

      let query = {
        // job_title: {
        //   $regex: search,
        //   $options: 'i',
        // },
      };
      if (filterIs) query.category = filterIs;
      const count = await jobCollections.countDocuments(query);
      res.send({ count: count });
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
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // getting jobs data by email =>
    app.get('/jobs/:email', logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      // if (req.user.email !== email) {
      //   return res.status(403).send({ message: 'forbidden access' });
      // }
      const query = { 'buyer.email': email };
      const result = await jobCollections.find(query).toArray();
      res.send(result);
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
        res.status(400).send(err.message);
        console.log(err);
      }
    });

    // getting users bids by  their emails = >
    app.get('/my-bids/:email', logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const result = await bidCollections.find(query).toArray();
      res.send(result);
    });

    // getting buyers data bid request
    app.get('/bid-request/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const result = await bidCollections.find(query).toArray();
      res.send(result);
      console.log(result);
    });

    // updating bids data froms buyer  =>
    app.patch('/bid-buyer/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const updateDoc = { $set: data };
      const query = { _id: new ObjectId(id) };
      const result = await bidCollections.updateOne(query, updateDoc);
      res.send(result);
    });
    // updating bids data from seller =>

    app.patch('/bid-seller/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;
      const updateDoc = {
        $set: {
          ...data,
        },
      };
      const result = await bidCollections.updateOne(query, updateDoc);
      res.send(result);
    });
    // adding bids =>
    app.post('/bids', async (req, res) => {
      const data = req.body;

      const bidExists = await bidCollections.findOne({
        jobId: data.jobId,
        email: data.email,
      });

      if (bidExists) {
        return res
          .status(400)
          .send('You have already placed a bid on this job');
      }

      try {
        if (!data) {
          res.status(400).send({ data: { message: 'Data not found' } });
        }
        const result = await bidCollections.insertOne(data);
        res.send(result);
      } catch (err) {
        console.log(err?.message);
        res.send(err);
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
