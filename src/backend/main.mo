import List "mo:core/List";

actor {
  let temperatures = List.empty<Int>();

  public shared ({ caller }) func addTemperature(value : Int) : async () {
    temperatures.add(value);
  };

  public query ({ caller }) func getTemperatures() : async [Int] {
    temperatures.toArray();
  };
};
