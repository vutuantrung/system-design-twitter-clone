const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function sendTweet(tweet) {
    await producer.connect();
    await producer.send({
        topic: 'tweets',
        messages: [
            { value: JSON.stringify(tweet) }
        ]
    });
    console.log('Tweet sent to Kafka:', tweet);
    await producer.disconnect();
}

module.exports = { sendTweet };