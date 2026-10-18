from flask import Flask
import mysql.connector

app = Flask(__name__)

connection = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Off-Meta03",
    database="quizdb"
)

@app.route("/getTable", methods=["GET", "POST"])
def get_tables():
 cursor = connection.cursor()

 cursor.execute("SHOW TABLES;")

 tables = cursor.fetchall()

 print(tables)

 cursor.close()

 return str(tables)

if __name__ == "__main__":
    app.run(debug=True)

#http://127.0.0.1:5000/getTable sa browser para makita yung requested data
