/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zrulesmap/rulesmapping/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
