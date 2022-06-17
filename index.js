// docs- https://documenter.getpostman.com/view/21513886/UzBjtoYV
// required imprts
const express = require('express');
const methodOverride = require('method-override');
const { MongoClient, MongoServerError, ObjectId } = require('mongodb');

//consts
const baseUrl = '/api/v3/app';
const mongoUrl = 'mongodb://127.0.0.1:27017';
const dbName = 'dtEvents';
const collectionName = 'allEvents';

// drivers config
const app = express();
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const client = new MongoClient(mongoUrl);


// connection to the database
async function main() {
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  // server code Express code
  app.get(`${baseUrl}/events`, async (req, res) => {
    // when id is provided
    try {
      let requiredEvent;
      if (req.query.id) {
        const id = new ObjectId(req.query.id);
        requiredEvent = await collection.findOne({ _id: id });

        if (requiredEvent && requiredEvent.schedule)
          requiredEvent.schedule = convertDateTimeToString(requiredEvent.schedule);

      } else {
        let { type, limit, page } = req.query;
        type = (type == 'latest') ? parseInt(-1) : parseInt(1);
        limit = (limit >= 1) ? parseInt(limit) : parseInt(0);
        page = (page >= 1) ? parseInt(page) : parseInt(0);

        requiredEvent = await collection.find()
          .sort({ _id: type })
          .skip(page > 0 ? ((page - 1) * page) : 0)
          .limit(limit)
          .toArray();

        requiredEvent.forEach((value) => {
          if (value.schedule) 
            value.schedule = convertDateTimeToString(value.schedule);
        })

      }
      // if empty send {undefined}
      res.send(requiredEvent || {undefined});

    } catch (error) {
      console.log('Error Occured==>', error);
      res.send({});
    }
  })

  // POST to create an event and returns its uid
  app.post(`${baseUrl}/events`, async (req, res) => {

    try {
      //parsing date- expected input yyyy-mm-ddTHH-mm-ss
      let newEvent = req.body;
      if (req.body.schedule){
        let newSchedule = new Date(req.body.schedule)
        // current dateTime is used if inavalid format is passed
        if (newSchedule.toString() == 'Invalid Date')
          newSchedule = new Date();
        
        req.body.schedule = newSchedule;
      }

      const createdEvent = await collection.insertOne(newEvent);
      res.send({ id: createdEvent.insertedId });
    } catch (error) {
      console.log('Error is =>', error);
    }
  })

  // Put to replace existing event with id
  app.put(`${baseUrl}/events/:id`, async (req, res) => {
    try {
      const id = ObjectId(req.params.id);
      let newEvent = req.body

      if (req.body.schedule) {
        let newSchedule = new Date(req.body.schedule)
        // dateTime remains same if invalid format is passed
        if (newSchedule.toString() != 'Invalid Date')
          newEvent.schedule = newSchedule;
        else{
          delete newEvent.schedule;
        }
      }

      var requiredEvent = await collection.updateOne({ _id: id }, {
        $set: newEvent
      });

      if (requiredEvent.matchedCount)
        res.send({ id: req.params.id });
      else
        throw error;

    } catch {
      res.send({ undefined });
    }
  })

  // delete item based on id
  app.delete(`${baseUrl}/events/:id`, async (req, res) => {
    try {
      const id = ObjectId(req.params.id);
      const requiredEvent = await collection.deleteOne({ _id: id });

      if (requiredEvent.deletedCount)
        res.send({ id: req.params.id });
      else
        throw error;

    } catch (error) {
      res.send({ undefined });
    }
  })

  // helper functions
  function convertDateTimeToString(schedule) {
    const date = schedule.toJSON().split('T')[0];
    let hours = schedule.getHours();
    let minutes = schedule.getMinutes();
    let seconds = schedule.getSeconds();


    hours = (parseInt(hours)) < 10 ? '0' + hours : hours;
    minutes = (parseInt(minutes)) < 10 ? '0' + minutes : minutes;
    seconds = (parseInt(seconds)) < 10 ? '0' + seconds : seconds;
    return `${date}T${hours}:${minutes}:${seconds}`;
  }
  return 'done.';
}

main()
  .then(console.log)
  .catch(console.error)

app.listen(5000);
