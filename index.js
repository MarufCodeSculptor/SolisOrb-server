const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const corsOptions= {
     origin:['http://localhost:5173',],
     credentials:true,
     opstionSuccessStatus:200
}
// midlewere--------
app.use(cors(corsOptions));
app.use(express.json());


app.get('/', async (req, res) => {
  res.send('access to root outsie of the mongodb');
});

const { MongoClient, ServerApiVersion } = require('mongodb');
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
    const jobCollections = client
      .db('SolisOrbBase')
      .collection('jobs');
// getting all jobs data => 
  app.get('/jobs',async(req,res)=>{
    const result = await jobCollections.find().toArray();
    res.send(result)


  })
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    console.log('coming from finally');
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`listening to the  PORT ${PORT}`);
});
