import Time "mo:core/Time";
import List "mo:core/List";

actor {
  type Temperature = {
    value : Int;
    timestamp : Int;
  };

  type HeaderField = (Text, Text);
  type HttpRequest = {
    method : Text;
    url : Text;
    headers : [HeaderField];
    body : Blob;
  };
  type HttpResponse = {
    status_code : Nat16;
    headers : [HeaderField];
    body : Blob;
  };

  let temperatures = List.empty<Temperature>();

  public shared func addTemperature(value : Int) : async () {
    let temperature : Temperature = {
      value;
      timestamp = Time.now();
    };
    temperatures.add(temperature);
  };

  public query func getTemperatures() : async [Temperature] {
    temperatures.toArray();
  };

  public shared func deleteTemperature(index : Nat) : async () {
    let arr = temperatures.toArray();
    temperatures.clear();
    for (i in arr.keys()) {
      if (i != index) {
        temperatures.add(arr[i]);
      };
    };
  };

  public shared func deleteTemperatures(indices : [Nat]) : async () {
    let arr = temperatures.toArray();
    temperatures.clear();
    for (i in arr.keys()) {
      var skip = false;
      for (idx in indices.vals()) {
        if (i == idx) { skip := true };
      };
      if (not skip) {
        temperatures.add(arr[i]);
      };
    };
  };

  public query func http_request(_ : HttpRequest) : async HttpResponse {
    let arr = temperatures.toArray();
    var json = "[";
    var first = true;
    for (t in arr.vals()) {
      if (not first) { json := json # "," };
      json := json # "{\"value\":" # t.value.toText() # ",\"timestamp\":" # t.timestamp.toText() # "}";
      first := false;
    };
    json := json # "]";
    {
      status_code = 200;
      headers = [
        ("Content-Type", "application/json"),
        ("Access-Control-Allow-Origin", "*"),
      ];
      body = json.encodeUtf8();
    };
  };
};
