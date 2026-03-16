import Time "mo:core/Time";
import List "mo:core/List";
import Array "mo:core/Array";

actor {
  type Temperature = {
    value : Int;
    timestamp : Int;
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
};
