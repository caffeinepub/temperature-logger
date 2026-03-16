import List "mo:core/List";

module {
  type OldActor = {
    temperatures : List.List<Int>;
  };

  type NewTemperature = {
    value : Int;
    timestamp : Int;
  };

  type NewActor = {
    temperatures : List.List<NewTemperature>;
  };

  public func run(old : OldActor) : NewActor {
    let newTemperatures = old.temperatures.map<Int, NewTemperature>(
      func(value) {
        { value; timestamp = value : Int };
      }
    );
    { temperatures = newTemperatures };
  };
};

