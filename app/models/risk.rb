class Risk < ActiveRecord::Base
  include AuthoredModel
  include SluggedModel
  include SearchableModel
  include AuthorizedModel
  include RelatedModel
  include SanitizableAttributes

  CATEGORY_TYPE_ID = 103

  RATINGS = {
    1 => "Minimal",
    2 => "Moderate",
    3 => "Significant",
    4 => "Major",
    5 => "Extreme"
  }

  attr_accessible :title, :slug, :description, :url, :version, :type, :start_date, :stop_date, :likelihood, :likelihood_rating, :threat_vector, :trigger, :preconditions, :financial_impact, :financial_impact_rating, :reputational_impact, :reputational_impact_rating, :operational_impact, :operational_impact_rating

  has_many :object_people, :as => :personable, :dependent => :destroy
  has_many :people, :through => :object_people

  has_many :object_documents, :as => :documentable, :dependent => :destroy
  has_many :documents, :through => :object_documents

  # Many to many with RiskyAttribute
  has_many :risk_risky_attributes, :dependent => :destroy
  has_many :risky_attributes, :through => :risk_risky_attributes

  # Many to many with Control
  has_many :control_risks, :dependent => :destroy
  has_many :controls, :through => :risk_risky_attributes

  # Categories
  has_many :categorizations, :as => :categorizable, :dependent => :destroy
  has_many :categories, :through => :categorizations, :conditions => { :scope_id => Risk::CATEGORY_TYPE_ID }

  is_versioned_ext

  sanitize_attributes :description

  validates :title,
    :presence => { :message => "needs a value" }

  def display_name
    slug
  end
end
