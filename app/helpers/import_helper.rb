module ImportHelper
  def trim_array(a)
    while !a.empty? && a.last.blank?
      a.pop
    end
    a
  end

  def validate_import_slug(object, object_name, expected_slug)
    raise ImportException.new("#{object_name} Code column does not exist") unless object["slug"]
    raise ImportException.new("#{object_name} Code does not match current program") unless object["slug"] == expected_slug
  end

  def validate_import_type(object, expected_type)
    type = object.delete("type")
    raise ImportException.new("First column must be Type") unless type
    raise ImportException.new("Type must be #{expected_type}") unless type == expected_type
  end

  def read_import_headers(import, import_map, object_name, rows)
    trim_array(rows.shift).map do |heading|
      if heading == "Type"
        key = 'type'
      else
        key = import_map[heading]
        import[:messages] << "Invalid #{object_name} heading #{heading}" unless key
      end
      key
    end
  end

  def read_import(import, import_map, object_name, rows)
    headers = read_import_headers(import, import_map, object_name, rows)

    import[object_name.pluralize.to_sym] = rows.map do |values|
      Hash[*headers.zip(values).flatten]
    end
  end

  def render_import_error(message=nil)
    render '/error/import_error', :layout => false, :locals => { :message => message }
  end

  def handle_import_person(attrs, key, warning)
    if attrs[key].present?
      if attrs[key].include?('@')
        attrs[key] = Person.find_or_create_by_email!({:email => attrs[key]})
      else
        warning[key.to_sym] << "invalid email"
      end
    end
  end

  def handle_import_object_person(object, attrs, key)
    person = attrs.delete(key)
    existing = object.object_people.detect {|x| x.role == key}

    if existing && existing.person != person
      existing.destroy
    end

    if person
      object.object_people.new({:role => key, :person => person}, :without_protection => true)
    end
  end

  def handle_import_category(object, attrs, key)
    category = attrs.delete(key)

    if category.present?
      categories = category.split(',').map {|category| Category.find_or_create_by_name({:name => category})}
      object.categories = categories
    end
  end

  def parse_document_reference(ref_string)
    ref_string.split("\n").map do |ref|
      ref =~ /(.*)\[(\S+)(:?.*)\](.*)/
      link = $2
      if link.start_with?('//')
        link = "file:" + link
      end
      { :description => $1 + $4, :link => link, :title => ($3.present? ? $3 : link).strip }
    end
  end

  def handle_import_document_reference(object, attrs, key, warnings)
    ref_string = attrs.delete(key)
    if ref_string.present?
      documents = parse_document_reference(ref_string).map do |ref|
        begin
          Document.find_or_create_by_link!(ref)
        rescue
          warning[key.to_sym] << "invalid reference URL"
        end
      end
      object.documents = documents
    end
  end
end
