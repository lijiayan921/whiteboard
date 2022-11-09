function Person(name, age) {
  this.name = name;
  this.age = age;
  this.sayName = () => {
    console.log(this.name);
  };
}
const p1 = new Person("ljy", 9);
const p2 = new Person("xxx", 33);
console.log("p1", p1);
console.log("p2", p2);
p1.sayName();

let [h1, h2, h3] = ["play", "run", "sing"];
console.log(h1, h2, h3);

const stu = {
  name: "MING",
  hobby: ["play", "run", "sing"],
  address: {
    school: "ChongQing",
    home: "HENAN",
  },
  title: ["student", { year: 2022 }],
  skills: {
    speak() {
      this.name = "JACK";
    },
  },
};

const { title } = stu;
console.log(title);
const [, { year }] = title;
console.log(year);
