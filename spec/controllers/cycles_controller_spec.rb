require 'spec_helper'
require 'base_objects'
require 'authorized_controller'

describe CyclesController do
  include BaseObjects

  context "authorization" do
    before :each do
      create_base_objects

      # For use by authorized_controller tests
      @model = Cycle
      @object = @cycle
    end

    it_behaves_like "an authorized create"
    it_behaves_like "an authorized read", ['show']
    it_behaves_like "an authorized update", ['update']
  end
end