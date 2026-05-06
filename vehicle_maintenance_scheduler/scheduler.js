function validateVehicle(vehicle) {
  return (
    vehicle &&
    typeof vehicle.TaskID === "string" &&
    Number.isInteger(vehicle.Duration) &&
    vehicle.Duration > 0 &&
    Number.isInteger(vehicle.Impact) &&
    vehicle.Impact >= 0
  );
}

function normalizeVehicles(vehicles) {
  if (!Array.isArray(vehicles)) {
    throw new Error("Vehicles response must contain a vehicles array.");
  }

  return vehicles.filter(validateVehicle).map((vehicle) => ({
    taskId: vehicle.TaskID,
    duration: vehicle.Duration,
    impact: vehicle.Impact,
  }));
}

function normalizeDepots(depots) {
  if (!Array.isArray(depots)) {
    throw new Error("Depots response must contain a depots array.");
  }

  return depots.map((depot) => {
    if (!Number.isInteger(depot.ID) || !Number.isInteger(depot.MechanicHours)) {
      throw new Error("Each depot must have integer ID and MechanicHours fields.");
    }

    return {
      depotId: depot.ID,
      mechanicHours: depot.MechanicHours,
    };
  });
}

function solveForDepot(vehicles, mechanicHours) {
  if (!Number.isInteger(mechanicHours) || mechanicHours < 0) {
    throw new Error("Mechanic hours must be a non-negative integer.");
  }

  const capacity = mechanicHours;
  const bestImpact = new Array(capacity + 1).fill(0);
  const choice = Array.from({ length: vehicles.length }, () =>
    new Array(capacity + 1).fill(false)
  );

  for (let index = 0; index < vehicles.length; index += 1) {
    const vehicle = vehicles[index];

    for (let hours = capacity; hours >= vehicle.duration; hours -= 1) {
      const candidateImpact = bestImpact[hours - vehicle.duration] + vehicle.impact;

      if (candidateImpact > bestImpact[hours]) {
        bestImpact[hours] = candidateImpact;
        choice[index][hours] = true;
      }
    }
  }

  const selectedTasks = [];
  let remainingHours = capacity;

  for (let index = vehicles.length - 1; index >= 0; index -= 1) {
    if (choice[index][remainingHours]) {
      const vehicle = vehicles[index];
      selectedTasks.push(vehicle);
      remainingHours -= vehicle.duration;
    }
  }

  selectedTasks.reverse();

  const usedHours = selectedTasks.reduce((total, task) => total + task.duration, 0);
  const totalImpact = selectedTasks.reduce((total, task) => total + task.impact, 0);

  return {
    mechanicHours,
    usedHours,
    remainingHours: mechanicHours - usedHours,
    totalImpact,
    selectedCount: selectedTasks.length,
    selectedTasks,
  };
}

function scheduleMaintenance(depotsInput, vehiclesInput) {
  const depots = normalizeDepots(depotsInput);
  const vehicles = normalizeVehicles(vehiclesInput);

  return depots.map((depot) => ({
    depotId: depot.depotId,
    ...solveForDepot(vehicles, depot.mechanicHours),
  }));
}

module.exports = {
  scheduleMaintenance,
  solveForDepot,
};
