// const DynamoDB = require("@aws-sdk/client-dynamodb");
// const DynamoDBClient = DynamoDB.DynamoDBClient;
// const PutItemCommand = DynamoDB.PutItemCommand;
// const DYNAMO_DB_TABLE_NAME = "yelp-restaurants";
var fs = require("fs");
var intersection = require("lodash.intersection");

// const ddbClient = new DynamoDBClient({
//   region: "us-east-1",
//   credentials: {
//   },
// });

// const options = {
//   method: "GET",
//   headers: {
//     accept: "application/json",
//     Authorization:
//   },
// };

// function fetchFromYelp() {
//   let results = [];
//   let offset = 0;

//   for (let limit = 50; limit <= 5000; limit += 50) {
//     let url =
//       offset === 0
//         ? "https://api.yelp.com/v3/businesses/search?location=new%20york%20city&categories=asian&categories=mexican&categories=indian&categories=american&sort_by=best_match&limit=50"
//         : `https://api.yelp.com/v3/businesses/search?location=new%20york%20city&categories=asian&categories=mexican&categories=indian&categories=american&sort_by=best_match&limit=50&offset=${offset}`;

//     fetch(url, options)
//       .then((response) => response.json())
//       .then((response) => {
//         console.log(response);
//         response.businesses.forEach((yelpResponse) => {
//           const dbObject = transformObject(yelpResponse);
//           results.push(dbObject);
//           //   putItemInDynamoDB(dbObject);
//         });
//         offset = limit;
//       })
//       .catch((err) => console.error(err));
//   }

//   fs.writeFileSync(
//     "yelp-data.json",
//     JSON.stringify({ businesses: results }, null, 2),
//     "utf8"
//   );
// }

function transformObject(yelpLine) {
  return {
    business_id: yelpLine.business_id || "",
    name: yelpLine.name || "",
    address: yelpLine.address,
    latitude: yelpLine.latitude || 0,
    longitude: yelpLine.longitude || 0,
    review_count: yelpLine.review_count || 0,
    rating: yelpLine.stars || "$",
    zip_code: yelpLine.postal_code || "00000",
  };
}

// async function putItemInDynamoDB(item) {
//   const params = {
//     TableName: DYNAMO_DB_TABLE_NAME, // Replace with your table name
//     Item: {
//       business_id: { S: item.BusinessID },
//       name: { S: item.Name },
//       address: { S: item.Address },
//       coordinates: {
//         M: {
//           latitude: { N: item.Coordinates.Latitude.toString() },
//           longitude: { N: item.Coordinates.Longitude.toString() },
//         },
//       },
//       number_of_reviews: { N: item.NumberOfReviews.toString() },
//       rating: { N: item.Rating.toString() },
//       zip_code: { S: item.ZipCode },
//     },
//   };

//   try {
//     const data = await ddbClient.send(new PutItemCommand(params));
//     console.log(
//       "Item successfully added to DynamoDB",
//       data["$metadata"].requestId
//     );
//   } catch (err) {
//     console.error("Error adding item to DynamoDB", err);
//   }
// }

// fetchFromYelp();

// const file = require("");
const lineReader = require("readline").createInterface({
  input: require("fs").createReadStream(
    "./yelp_academic_dataset_business.json"
  ),
});

const res = [];
let entries = 0;
const cuisines = ["mexican", "indian", "chinese", "fast food"];

lineReader.on("line", function (line) {
  const parsedLine = JSON.parse(line);
  const newYelpObject = transformObject(parsedLine);
  if (["CA", "NJ", "PA", "FL"].includes(parsedLine.state)) {
    const categories = parsedLine.categories;
    if (categories && categories.length) {
      const category_split = parsedLine.categories.split(", ");
      if (!category_split) {
        return;
      }
      const m_category_split = category_split.map((cat) => cat.toLowerCase());
      if (m_category_split.some((cat) => cuisines.includes(cat))) {
        newYelpObject.category =
          intersection(m_category_split, cuisines)[0] || "";
        res.push(newYelpObject);
      }
    }
  }
  entries++;
});

lineReader.on("close", () => {
  fs.writeFileSync("data.json", JSON.stringify(res), "utf8");
  console.log(res.length, "objects were written out of", entries, "entries");
});
