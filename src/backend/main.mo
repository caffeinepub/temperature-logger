import Time "mo:core/Time";
import List "mo:core/List";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Temperature = {
    value : Int;
    timestamp : Int;
  };

  let temperatures = List.empty<Temperature>();

  public shared ({ caller }) func addTemperature(value : Int) : async () {
    let temperature : Temperature = {
      value;
      timestamp = Time.now();
    };
    temperatures.add(temperature);
  };

  public query ({ caller }) func getTemperatures() : async [Temperature] {
    temperatures.toArray();
  };
};
