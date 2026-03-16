import Array "mo:base/Array";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";

actor {
  type Device = {
    id : Nat;
    name : Text;
  };

  type Temperature = {
    deviceId : Nat;
    value : Int;
    timestamp : Int;
  };

  stable var devices : [Device] = [];
  stable var temperatures : [Temperature] = [];
  stable var nextDeviceId : Nat = 0;

  // ---- Devices ----

  public func addDevice(name : Text) : async Nat {
    let id = nextDeviceId;
    nextDeviceId += 1;
    devices := Array.append(devices, [{ id; name }]);
    id
  };

  public query func getDevices() : async [Device] {
    devices
  };

  public func renameDevice(id : Nat, name : Text) : async Bool {
    var found = false;
    devices := Array.map<Device, Device>(devices, func(d) {
      if (d.id == id) { found := true; { id = d.id; name } }
      else d
    });
    found
  };

  public func deleteDevice(id : Nat) : async Bool {
    let before = devices.size();
    devices := Array.filter<Device>(devices, func(d) { d.id != id });
    temperatures := Array.filter<Temperature>(temperatures, func(t) { t.deviceId != id });
    devices.size() < before
  };

  // ---- Temperatures ----

  public func addTemperature(deviceId : Nat, value : Int) : async Bool {
    let exists = Array.find<Device>(devices, func(d) { d.id == deviceId });
    switch (exists) {
      case null false;
      case _ {
        let ts = Time.now();
        temperatures := Array.append(temperatures, [{ deviceId; value; timestamp = ts }]);
        true
      };
    }
  };

  public query func getTemperatures(deviceId : Nat) : async [{ value : Int; timestamp : Int }] {
    let filtered = Array.filter<Temperature>(temperatures, func(t) { t.deviceId == deviceId });
    Array.map<Temperature, { value : Int; timestamp : Int }>(filtered, func(t) { { value = t.value; timestamp = t.timestamp } })
  };

  public func deleteTemperature(deviceId : Nat, index : Nat) : async Bool {
    let filtered = Array.filter<Temperature>(temperatures, func(t) { t.deviceId == deviceId });
    if (index >= filtered.size()) return false;
    let buf = Buffer.fromArray<Temperature>(temperatures);
    var count = 0;
    var actualIdx = 0;
    var found = false;
    let size = temperatures.size();
    if (size == 0) return false;
    for (i in Iter.range(0, size - 1)) {
      if (temperatures[i].deviceId == deviceId) {
        if (count == index) { actualIdx := i; found := true };
        count += 1;
      };
    };
    if (not found) return false;
    buf.remove(actualIdx);
    temperatures := Buffer.toArray(buf);
    true
  };

  public func deleteTemperatures(deviceId : Nat, indices : [Nat]) : async Bool {
    let size = temperatures.size();
    if (size == 0) return true;
    var globalIndices : [Nat] = [];
    var count = 0;
    for (i in Iter.range(0, size - 1)) {
      if (temperatures[i].deviceId == deviceId) {
        let localIdx = count;
        if (Array.find<Nat>(indices, func(n) { n == localIdx }) != null) {
          globalIndices := Array.append(globalIndices, [i]);
        };
        count += 1;
      };
    };
    temperatures := Array.filterEntries<Temperature>(temperatures, func(i, _) {
      Array.find<Nat>(globalIndices, func(n) { n == i }) == null
    });
    true
  };

  // ---- HTTP ----

  func intToText(n : Int) : Text {
    if (n < 0) { "-" # Nat.toText(Int.abs(n)) }
    else Nat.toText(Int.abs(n))
  };

  public query func http_request(req : { url : Text; method : Text; headers : [(Text, Text)]; body : Blob }) : async { status_code : Nat16; headers : [(Text, Text)]; body : Blob } {
    if (Text.startsWith(req.url, #text "/temperatures")) {
      var deviceId : ?Nat = null;
      let parts = Text.split(req.url, #char '?');
      let partsArr = Iter.toArray(parts);
      if (partsArr.size() > 1) {
        let query_ = partsArr[1];
        let kvs = Text.split(query_, #char '&');
        for (kv in kvs) {
          let pair = Iter.toArray(Text.split(kv, #char '='));
          if (pair.size() == 2 and pair[0] == "device") {
            switch (Nat.fromText(pair[1])) {
              case (?n) { deviceId := ?n };
              case null {};
            };
          };
        };
      };

      let targetId : Nat = switch (deviceId) {
        case (?id) id;
        case null 0;
      };

      let filtered = Array.filter<Temperature>(temperatures, func(t) { t.deviceId == targetId });
      var json = "[";
      var first = true;
      for (t in filtered.vals()) {
        if (not first) { json #= "," };
        first := false;
        let ms = t.timestamp / 1_000_000;
        json #= "{\"value\":" # intToText(t.value) # ",\"timestamp\":" # intToText(t.timestamp) # ",\"recorded_at\":\"" # intToText(ms) # "\"}";
      };
      json #= "]";
      {
        status_code = 200;
        headers = [("Content-Type", "application/json"), ("Access-Control-Allow-Origin", "*")];
        body = Text.encodeUtf8(json);
      }
    } else {
      {
        status_code = 404;
        headers = [("Content-Type", "text/plain")];
        body = Text.encodeUtf8("Not found");
      }
    }
  };
};
