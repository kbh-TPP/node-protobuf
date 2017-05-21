var test1 = require("./lm.helloworld.js");

var obj = {
	id: 1,
	str: "brian",
	opt: 3
};

var buffer = test1.lm.helloworld.encode(obj).finish();

console.log(buffer);

var obj = test1.lm.helloworld.decode(buffer);

console.log(obj);

var person = test1.lm.helloworld.create(obj);

console.log(person);

