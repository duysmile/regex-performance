const express = require('express');

const app = express();

const data = "1111111111111111111111113333333";

app.use(express.json());
app.get('/ping', (req, res) => {
    res.send('pong');
});

app.post('/check-operations', (req, res) => {
    const { operation } = req.body;
	const regex = /(\d+[+-]?)+=/gm;

	console.time("regex run");
    const matchData = regex.test(operation);
    console.timeEnd("regex run");

    if (matchData) {
        return res.send(matchData);
    }

    res.send("not found");
});

app.listen(3000, () => {
    console.log('Server started at port 3000');
});
