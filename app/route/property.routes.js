module.exports = app => {
  const alert = require("../controllers/property.controller.js");
  var router = require("express").Router();
  const { authJwt } = require("../middleware");

  // Create a new Tutorial
  // router.post("/search_properties", alert.search_properties);
  // //
  // router.get("/all_values", alert.all_values);
  // router.get("/search_cities", alert.search_cities);
  // router.get("/all_cities", alert.all_cities);
  // // router.get("/properties_by_type", alert.properties_type);
  // router.post("/property_by_id", alert.property_by_id);
  // router.get("/similar_properties", alert.similar_properties);
  // router.get("/author_details", alert.author_details);
  // router.post("/feature_property", alert.feature_property);
  // router.post("/cities_property", alert.cities_property);
  // router.post("/locations", alert.locations);
  // router.post("/write_reviews", alert.write_reviews);
  // router.post("/add_to_favorite",alert.add_to_favorite);
  // router.post("/get_favorite", alert.get_favorite);
  // router.post("/update_property_controller", alert.update_property_controller);
  // router.post("/create_property", alert.create_property);
  // router.post("/property_by_user_id", alert.property_by_user_id);
  // router.post("/get_propertyby_user_by_id", alert.get_propertyby_user_by_id);
  // router.get("/get_property_facilities", alert.get_property_facilities);
  // router.post("/property_transaction",alert.property_transaction);
  // router.post("/get_all_transaction/",alert.get_all_transaction);
  // router.post("/contact_seller",alert.contact_seller);
  // router.post("/contact_seller",alert.contact_seller);
  // router.post("/create_respones",alert.create_respones);
  // router.post("/get_respones",alert.get_respones);
  // router.post("/user_dashboard",alert.user_dashboard);
  // router.post("/update_drag_status",alert.update_drag_status);
  // router.get("/get_all_services",alert.get_all_services);
  // router.post("/create_property_alert",alert.create_property_alert);
  // router.get("/get_all_services_provider/:uid",alert.get_all_services_provider);
  // router.get("/get_all_package",alert.get_all_package);
  // router.post("/delete_property",alert.delete_property);
  // router.post("/create_payment_intent",alert.create_payment_intent);
  // router.post("/property_alert",alert.property_alert);
  // router.post("/contact_page_user",alert. contact_page_user);
  // router.post("/delete_property_image",alert.delete_property_image);
  // router.get("/get_pages_data/:page_type",alert.get_pages_data);
  // router.get("/get_all_setting_data",alert.get_all_setting_data);
  // router.get("/get_approved_property",alert.get_approved_property);
  // router.post("/property_alert_delete",alert.property_alert_delete);
  // router.post("/create_property_appointment_calendar",alert.create_property_appointment_calendar);
  // router.get("/get_property_appointment_calendar",alert.get_property_appointment_calendar);
  // router.post("/create_moving_items",alert.create_moving_items);
  // router.get("/get_moving_item",alert.get_moving_item);  
  // router.post("/user_permission",alert.user_permission);
  // router.post("/applied_to_nextflat_list",alert.applied_to_nextflat_list);  
  // router.get("/get_payment_sponsor",alert.get_payment_sponsor);  
  // router.get("/store_invoice",alert.store_invoice);  



  
  
  
  
  
  
  // Retrieve all published Tutorials
  app.use('/api/property', router);
};
